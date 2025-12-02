import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
  TransactionStage,
} from './schemas/transaction.schema';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/index';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    try {
      const createdTransaction = new this.transactionModel({
        ...dto,
        stage: TransactionStage.AGREEMENT,
        financialBreakdown: {
          agency: 0,
          listingAgent: 0,
          sellingAgent: 0,
        },
        commissionDetail: '',
        earnest_money: 0,
      });

      return createdTransaction.save();
    } catch (error) {
      console.error('Transaction creation failed:', error);

      throw new InternalServerErrorException('Transaction creation failed');
    }
  }

  private calculateCommission(data: CreateTransactionDto | Transaction) {
    const total = data.totalServiceFee;
    const agencyShare = total * 0.5;
    let listingShare = 0;
    let sellingShare = 0;

    const listingAgent = data.listingAgent;
    const sellingAgent = data.sellingAgent;

    if (listingAgent === sellingAgent) {
      listingShare = total * 0.5;
    } else {
      listingShare = total * 0.25;
      sellingShare = total * 0.25;
    }

    return {
      agency: agencyShare,
      listingAgent: listingShare || undefined,
      sellingAgent: sellingShare || undefined,
    };
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionModel.find().exec();
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionModel.findById(id).exec();
    if (!transaction) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }
    return transaction;
  }

  async updateStage(dto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.transactionModel.findById(dto.id).exec();
    if (!transaction) {
      throw new NotFoundException(`Transaction with id ${dto.id} not found`);
    }

    this.validateStageTransition(transaction.stage, dto.stage);

    const changes: Record<string, any> = {};

    if ((dto.stage as TransactionStage) === TransactionStage.EARNEST_MONEY) {
      if (!dto.earnest_money) {
        throw new Error('Earnest money must be provided for this stage.');
      }
      if (transaction.earnest_money !== dto.earnest_money) {
        changes.earnest_money = dto.earnest_money;
        transaction.earnest_money = dto.earnest_money;
      }
    }

    if (transaction.stage !== (dto.stage as TransactionStage)) {
      changes.stage = { from: transaction.stage, to: dto.stage };
      transaction.stage = dto.stage as TransactionStage;
    }

    if ((dto.stage as TransactionStage) === TransactionStage.COMPLETED) {
      const financialBreakdown = this.calculateCommission(transaction);
      if (
        JSON.stringify(transaction.financialBreakdown) !==
        JSON.stringify(financialBreakdown)
      ) {
        changes.financialBreakdown = financialBreakdown;
        transaction.financialBreakdown = financialBreakdown;
      }

      const commissionDetail =
        transaction.listingAgent === transaction.sellingAgent
          ? 'Since the listing and selling companies are the same, all commission was transferred to the listing company.'
          : 'Since the listing and selling companies were different, half of the total amount was distributed to the companies in two shares and transferred to their accounts.';

      if (transaction.commissionDetail !== commissionDetail) {
        changes.commissionDetail = commissionDetail;
        transaction.commissionDetail = commissionDetail;
      }
    }

    transaction.stageHistory = transaction.stageHistory || [];
    transaction.stageHistory.push({
      stage: dto.stage as TransactionStage,
      changes,
      updatedAt: new Date(),
    });

    return transaction.save();
  }

  private validateStageTransition(current: TransactionStage, next: string) {
    const validTransitions: Record<TransactionStage, TransactionStage[]> = {
      [TransactionStage.AGREEMENT]: [TransactionStage.EARNEST_MONEY],
      [TransactionStage.EARNEST_MONEY]: [TransactionStage.TITLE_DEED],
      [TransactionStage.TITLE_DEED]: [TransactionStage.COMPLETED],
      [TransactionStage.COMPLETED]: [],
    };

    if (!validTransitions[current].includes(next as TransactionStage)) {
      throw new Error(
        `Invalid stage transition: You cannot jump from "${current}" to "${next}". Each stage must be completed step-by-step.`,
      );
    }
  }
}
