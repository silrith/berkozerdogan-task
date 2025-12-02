import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Transaction } from './schemas/transaction.schema';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/index';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('create')
  async create(@Body() dto: CreateTransactionDto): Promise<Transaction> {
    return this.transactionService.createTransaction(dto);
  }

  @Get('getAll')
  async findAll(): Promise<Transaction[]> {
    return this.transactionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Transaction> {
    return this.transactionService.findOne(id);
  }

  @Patch('update')
  async updateStage(@Body() dto: UpdateTransactionDto): Promise<Transaction> {
    return this.transactionService.updateStage(dto);
  }
}
