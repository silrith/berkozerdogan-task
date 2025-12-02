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

  @Prop({ required: true })
  listingAgent?: string;

  @Prop({ required: true })
  sellingAgent?: string;

  @Prop({ enum: TransactionStage, default: TransactionStage.AGREEMENT })
  stage: TransactionStage;

  @Prop({ type: Object })
  financialBreakdown?: {
    agency?: number;
    listingAgent?: number;
    sellingAgent?: number;
  };

  @Prop()
  commissionDetail?: string;

  @Prop()
  earnest_money?: number;

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
  })
  stageHistory?: {
    stage: TransactionStage;
    changes: Record<string, any>;
    updatedAt: Date;
  }[];
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
