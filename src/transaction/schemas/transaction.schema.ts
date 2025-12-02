import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionStage {
  AGREEMENT = 'agreement',
  EARNEST_MONEY = 'earnest_money',
  TITLE_DEED = 'title_deed',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true })
  totalServiceFee: number;

  @Prop()
  listingAgent?: string;

  @Prop()
  sellingAgent?: string;

  @Prop({ enum: TransactionStage, default: TransactionStage.AGREEMENT })
  stage: TransactionStage;

  @Prop({ type: Object })
  financialBreakdown?: {
    agency: number;
    listingAgent?: number;
    sellingAgent?: number;
  };
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
