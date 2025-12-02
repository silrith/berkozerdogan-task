import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Transaction } from './schemas/transaction.schema';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/index';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  async create(@Body() dto: CreateTransactionDto): Promise<Transaction> {
    return this.transactionService.createTransaction(dto);
  }

  @Get()
  async findAll(): Promise<Transaction[]> {
    return this.transactionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Transaction> {
    return this.transactionService.findOne(id);
  }

  @Patch(':id')
  async updateStage(
    @Param('id') id: string,
    @Body() dto: Omit<UpdateTransactionDto, 'id'>,
  ): Promise<Transaction> {
    return this.transactionService.updateStage({ ...dto, id });
  }
}
