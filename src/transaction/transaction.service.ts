import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
  TransactionStage,
} from './schemas/transaction.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
    const breakdown = this.calculateCommission(dto);

    const createdTransaction = new this.transactionModel({
      ...dto,
      stage: dto.stage ?? TransactionStage.AGREEMENT,
      financialBreakdown: breakdown,
    });

    return createdTransaction.save();
  }

  private calculateCommission(data: CreateTransactionDto | Transaction) {
    const total = data.totalServiceFee;
    const agencyShare = total * 0.5;
    let listingShare = 0;
    let sellingShare = 0;

    const listingAgent = data.listingAgent;
    const sellingAgent = data.sellingAgent;

    if (listingAgent && sellingAgent) {
      if (listingAgent === sellingAgent) {
        listingShare = total * 0.5;
      } else {
        listingShare = total * 0.25;
        sellingShare = total * 0.25;
      }
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

  async updateStage(
    id: string,
    newStage: TransactionStage,
  ): Promise<Transaction> {
    const transaction = await this.transactionModel.findById(id).exec();
    if (!transaction) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }

    const validTransitions: Record<TransactionStage, TransactionStage[]> = {
      [TransactionStage.AGREEMENT]: [TransactionStage.EARNEST_MONEY],
      [TransactionStage.EARNEST_MONEY]: [TransactionStage.TITLE_DEED],
      [TransactionStage.TITLE_DEED]: [TransactionStage.COMPLETED],
      [TransactionStage.COMPLETED]: [],
    };

    if (!validTransitions[transaction.stage].includes(newStage)) {
      throw new Error(
        `Invalid stage transition from ${transaction.stage} to ${newStage}`,
      );
    }

    transaction.stage = newStage;

    if (newStage === TransactionStage.COMPLETED) {
      transaction.financialBreakdown = this.calculateCommission(transaction);
    }

    return transaction.save();
  }
}
