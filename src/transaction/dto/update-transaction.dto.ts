import {
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { TransactionStage } from '../schemas/transaction.schema';

export class UpdateTransactionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEnum(TransactionStage)
  @IsNotEmpty()
  stage: TransactionStage;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Earnest money must be a positive number' })
  earnest_money?: number;
}
