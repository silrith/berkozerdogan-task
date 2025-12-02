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
        totalServiceFee: dto.totalServiceFee,
        listingAgent: dto.listingAgent,
        sellingAgent: dto.sellingAgent,
        stage: TransactionStage.AGREEMENT,
        financialBreakdown: {
          agency: 0,
          listingAgent: 0,
          sellingAgent: 0,
        },
        commissionDetail: '',
        stageHistory: [
          {
            stage: TransactionStage.AGREEMENT,
            changes: {
              totalServiceFee: dto.totalServiceFee,
              listingAgent: dto.listingAgent,
              sellingAgent: dto.sellingAgent,
            },
            updatedAt: new Date(),
          },
        ],
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
      sellingShare = 0;
    } else {
      listingShare = total * 0.25;
      sellingShare = total * 0.25;
    }

    return {
      agency: agencyShare,
      listingAgent: listingShare,
      sellingAgent: sellingShare,
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

    if (dto.stage === TransactionStage.EARNEST_MONEY) {
      if (dto.earnest_money === undefined || dto.earnest_money === null) {
        throw new Error('Earnest money must be provided for this stage.');
      }
      if (dto.earnest_money < 0) {
        throw new Error('Earnest money must be a positive number.');
      }
      changes.earnest_money = dto.earnest_money;
    }

    if (transaction.stage !== dto.stage) {
      changes.stage = { from: transaction.stage, to: dto.stage };
      transaction.stage = dto.stage;
    }

    if (dto.stage === TransactionStage.COMPLETED) {
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
          ? `Since the listing and selling agents are the same (${transaction.listingAgent}), the agent receives 100% of the agent portion (50%): ${financialBreakdown.listingAgent} units.`
          : `Since the listing and selling agents are different, they share equally. Listing agent (${transaction.listingAgent}): ${financialBreakdown.listingAgent} units. Selling agent (${transaction.sellingAgent}): ${financialBreakdown.sellingAgent} units.`;

      if (transaction.commissionDetail !== commissionDetail) {
        changes.commissionDetail = commissionDetail;
        transaction.commissionDetail = commissionDetail;
      }
    }

    transaction.stageHistory = transaction.stageHistory || [];
    transaction.stageHistory.push({
      stage: dto.stage,
      changes,
      updatedAt: new Date(),
    });

    return transaction.save();
  }

  private validateStageTransition(
    current: TransactionStage,
    next: TransactionStage,
  ) {
    const validTransitions: Record<TransactionStage, TransactionStage[]> = {
      [TransactionStage.AGREEMENT]: [TransactionStage.EARNEST_MONEY],
      [TransactionStage.EARNEST_MONEY]: [TransactionStage.TITLE_DEED],
      [TransactionStage.TITLE_DEED]: [TransactionStage.COMPLETED],
      [TransactionStage.COMPLETED]: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new Error(
        `Invalid stage transition: You cannot jump from "${current}" to "${next}". Each stage must be completed step-by-step.`,
      );
    }
  }
}
