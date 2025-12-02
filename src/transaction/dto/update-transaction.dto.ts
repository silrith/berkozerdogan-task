import { IsNumber, IsString } from 'class-validator';

export class UpdateTransactionDto {
  @IsNumber()
  earnest_money?: number;

  @IsString()
  id: string;

  @IsString()
  stage: string;
}
