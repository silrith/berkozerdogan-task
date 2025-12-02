import { IsNumber, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  totalServiceFee: number;

  @IsString()
  listingAgent: string;

  @IsString()
  sellingAgent: string;

  @IsNumber()
  earnest_money?: number;
}
