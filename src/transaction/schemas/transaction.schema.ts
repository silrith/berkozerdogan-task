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
  @Prop({ required: true, type: Number, min: 0 })
  totalServiceFee: number;

  @Prop({ required: true, type: String })
  listingAgent: string;

  @Prop({ required: true, type: String })
  sellingAgent: string;

  @Prop({ enum: TransactionStage, default: TransactionStage.AGREEMENT })
  stage: TransactionStage;

  @Prop({
    type: {
      agency: { type: Number, default: 0 },
      listingAgent: { type: Number, default: 0 },
      sellingAgent: { type: Number, default: 0 },
    },
    default: { agency: 0, listingAgent: 0, sellingAgent: 0 },
  })
  financialBreakdown?: {
    agency: number;
    listingAgent: number;
    sellingAgent: number;
  };

  @Prop({ type: String, default: '' })
  commissionDetail?: string;

  @Prop({
    type: [
      {
        stage: {
          type: String,
          enum: Object.values(TransactionStage),
          required: true,
        },
        changes: { type: Object, default: {} },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  stageHistory?: {
    stage: TransactionStage;
    changes: Record<string, any>;
    updatedAt: Date;
  }[];
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
