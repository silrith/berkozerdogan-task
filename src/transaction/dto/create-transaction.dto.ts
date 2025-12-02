import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  @Min(0, { message: 'Total service fee must be a positive number' })
  @IsNotEmpty()
  totalServiceFee: number;

  @IsString()
  @IsNotEmpty()
  listingAgent: string;

  @IsString()
  @IsNotEmpty()
  sellingAgent: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Earnest money must be a positive number' })
  earnest_money?: number;
}
