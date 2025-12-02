import { IsNumber, IsOptional, IsString } from 'class-validator';
import { TransactionStage } from '../schemas/transaction.schema';

export class CreateTransactionDto {
  @IsNumber()
  totalServiceFee: number;

  @IsOptional()
  @IsString()
  listingAgent?: string;

  @IsOptional()
  @IsString()
  sellingAgent?: string;

  @IsOptional()
  stage?: TransactionStage;
}
