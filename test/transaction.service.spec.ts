import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { TransactionService } from '../src/transaction/transaction.service';
import {
  Transaction,
  TransactionDocument,
  TransactionStage,
} from '../src/transaction/schemas/transaction.schema';
import { CreateTransactionDto } from '../src/transaction/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../src/transaction/dto';
import { NotFoundException } from '@nestjs/common';

class MockTransactionModel {
  _id?: string;
  totalServiceFee?: number;
  listingAgent?: string;
  sellingAgent?: string;
  stage?: TransactionStage;
  earnest_money?: number;
  financialBreakdown?: any;
  commissionDetail?: string;
  stageHistory?: any[];

  constructor(data?: Partial<Transaction>) {
    if (data) Object.assign(this, data);
  }

  save = jest.fn().mockImplementation(async function (
    this: MockTransactionModel,
  ) {
    return this as unknown as Transaction;
  });

  static find = jest.fn();
  static findById = jest.fn();
}

describe('TransactionService (type-safe)', () => {
  let service: TransactionService;
  let mockModel: typeof MockTransactionModel &
    Partial<Record<keyof Model<TransactionDocument>, jest.Mock>>;

  const sampleTransaction: Transaction & { save?: jest.Mock } = {
    _id: '1',
    totalServiceFee: 1000,
    listingAgent: 'Alice',
    sellingAgent: 'Bob',
    stage: TransactionStage.AGREEMENT,
    financialBreakdown: { agency: 0, listingAgent: 0, sellingAgent: 0 },
  } as any;

  beforeEach(async () => {
    MockTransactionModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([sampleTransaction]),
    });
    MockTransactionModel.findById = jest
      .fn()
      .mockImplementation((id: string) => ({
        exec: jest
          .fn()
          .mockResolvedValue(
            id === sampleTransaction._id ? sampleTransaction : null,
          ),
      }));

    mockModel = MockTransactionModel as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getModelToken('Transaction'),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransaction', () => {
    it('creates and saves a transaction (constructor + save)', async () => {
      const dto: CreateTransactionDto = {
        totalServiceFee: 1500,
        listingAgent: 'Alice',
        sellingAgent: 'Bob',
      } as any;

      const created = await service.createTransaction(dto);

      expect(created).toBeDefined();
      expect(created.totalServiceFee).toBe(1500);
      expect(created.stage).toBe(TransactionStage.AGREEMENT);
      expect((created as any).save).toBeDefined();
    });

    it('throws InternalServerErrorException when constructor/save fails', async () => {
      const failingModel: any = function (this: any, data: any) {
        Object.assign(this, data);
        this.save = jest.fn().mockRejectedValue(new Error('boom'));
      };

      const module = await Test.createTestingModule({
        providers: [
          TransactionService,
          { provide: getModelToken('Transaction'), useValue: failingModel },
        ],
      }).compile();

      const svc = module.get<TransactionService>(TransactionService);

      await expect(
        svc.createTransaction({ totalServiceFee: 100 } as any),
      ).rejects.toThrow('boom');
    });
  });

  describe('calculateCommission (private)', () => {
    it('calculates shares when agents differ', () => {
      const breakdown = service['calculateCommission']({
        totalServiceFee: 1000,
        listingAgent: 'A',
        sellingAgent: 'B',
      } as any);
      expect(breakdown.agency).toBe(500);
      expect(breakdown.listingAgent).toBe(250);
      expect(breakdown.sellingAgent).toBe(250);
    });

    it('calculates shares when agents same', () => {
      const breakdown = service['calculateCommission']({
        totalServiceFee: 1000,
        listingAgent: 'A',
        sellingAgent: 'A',
      } as any);
      expect(breakdown.agency).toBe(500);
      expect(breakdown.listingAgent).toBe(500);
      expect(breakdown.sellingAgent).toBe(0);
    });
  });

  describe('findAll / findOne', () => {
    it('findAll returns array', async () => {
      const res = await service.findAll();
      expect(MockTransactionModel.find).toHaveBeenCalled();
      expect(res).toEqual([sampleTransaction]);
    });

    it('findOne returns document when exists', async () => {
      const res = await service.findOne('1');
      expect(MockTransactionModel.findById).toHaveBeenCalledWith('1');
      expect(res._id).toBe('1');
    });

    it('findOne throws NotFoundException when missing', async () => {
      MockTransactionModel.findById = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStage', () => {
    it('updates stage AGREEMENT -> EARNEST_MONEY when earnest_money provided', async () => {
      const instance: any = new MockTransactionModel(sampleTransaction as any);
      instance.save = jest.fn().mockResolvedValue(instance);
      MockTransactionModel.findById = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });

      const dto: UpdateTransactionDto = {
        id: '1',
        stage: TransactionStage.EARNEST_MONEY,
        earnest_money: 300,
      } as any;

      const res = await service.updateStage(dto);

      expect(res.stage).toBe(TransactionStage.EARNEST_MONEY);
      expect(instance.save).toHaveBeenCalled();
      expect(instance.stageHistory).toBeDefined();
      expect(
        instance.stageHistory[instance.stageHistory.length - 1].stage,
      ).toBe(TransactionStage.EARNEST_MONEY);
    });

    it('throws on invalid transition', async () => {
      const instance = new MockTransactionModel({
        ...sampleTransaction,
        stage: TransactionStage.TITLE_DEED,
      } as any);
      instance.save = jest.fn().mockResolvedValue(instance);
      MockTransactionModel.findById = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });

      await expect(
        service.updateStage({
          id: '1',
          stage: TransactionStage.AGREEMENT,
        } as any),
      ).rejects.toThrow('Invalid stage transition');
    });

    it('recalculates financial breakdown and commissionDetail on COMPLETED', async () => {
      const instance: any = new MockTransactionModel({
        ...sampleTransaction,
        stage: TransactionStage.TITLE_DEED,
        totalServiceFee: 2000,
        listingAgent: 'SameCo',
        sellingAgent: 'SameCo',
        financialBreakdown: { agency: 0 },
      } as any);
      instance.save = jest.fn().mockResolvedValue(instance);
      MockTransactionModel.findById = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(instance) });

      const res = await service.updateStage({
        id: '1',
        stage: TransactionStage.COMPLETED,
      } as any);

      expect(res.stage).toBe(TransactionStage.COMPLETED);
      expect(res.financialBreakdown).toBeDefined();
      expect(res.commissionDetail).toBeDefined();
      expect(instance.save).toHaveBeenCalled();
    });
  });
});
