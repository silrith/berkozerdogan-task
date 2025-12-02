import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from '../src/transaction/transaction.controller';
import { TransactionService } from '../src/transaction/transaction.service';
import { Transaction, TransactionStage } from '../src/transaction/schemas/transaction.schema';
import { CreateTransactionDto } from '../src/transaction/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../src/transaction/dto';

describe('TransactionController (type-safe)', () => {
  let controller: TransactionController;
  let service: TransactionService;

  const sampleTransaction: Transaction = {
    _id: '507f1f77bcf86cd799439011',
    totalServiceFee: 1000,
    listingAgent: 'Alice',
    sellingAgent: 'Bob',
    stage: TransactionStage.AGREEMENT,
    financialBreakdown: { agency: 500, listingAgent: 250, sellingAgent: 250 },
  } as any;

  const mockService = {
    createTransaction: jest.fn().mockResolvedValue(sampleTransaction),
    findAll: jest.fn().mockResolvedValue([sampleTransaction]),
    findOne: jest.fn().mockResolvedValue(sampleTransaction),
    updateStage: jest.fn().mockResolvedValue({
      ...sampleTransaction,
      stage: TransactionStage.EARNEST_MONEY,
    }),
  } as Partial<Record<keyof TransactionService, jest.Mock>> &
    TransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [{ provide: TransactionService, useValue: mockService }],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    service = module.get<TransactionService>(TransactionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('calls service.createTransaction and returns result', async () => {
      const dto: CreateTransactionDto = { totalServiceFee: 1200, listingAgent: 'Alice', sellingAgent: 'Bob' } as any;
      mockService.createTransaction!.mockResolvedValue({
        ...sampleTransaction,
        totalServiceFee: 1200,
      });

      const res = await controller.create(dto);

      expect(mockService.createTransaction).toHaveBeenCalledWith(dto);
      expect(res.totalServiceFee).toBe(1200);
    });

    it('propagates service errors', async () => {
      const dto: CreateTransactionDto = { totalServiceFee: 500, listingAgent: 'Alice', sellingAgent: 'Bob' } as any;
      mockService.createTransaction!.mockRejectedValue(new Error('db error'));

      await expect(controller.create(dto)).rejects.toThrow('db error');
      expect(mockService.createTransaction).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('returns transactions array', async () => {
      mockService.findAll!.mockResolvedValue([sampleTransaction]);
      const res = await controller.findAll();
      expect(mockService.findAll).toHaveBeenCalled();
      expect(res).toHaveLength(1);
      expect(res[0]._id).toBe(sampleTransaction._id);
    });
  });

  describe('findOne', () => {
    it('calls service.findOne with id and returns transaction', async () => {
      mockService.findOne!.mockResolvedValue(sampleTransaction);
      const res = await controller.findOne(sampleTransaction._id as string);
      expect(mockService.findOne).toHaveBeenCalledWith(sampleTransaction._id);
      expect(res._id).toBe(sampleTransaction._id);
    });

    it('propagates not found errors from service', async () => {
      mockService.findOne!.mockRejectedValue(new Error('not found'));
      await expect(controller.findOne('missing')).rejects.toThrow('not found');
    });
  });

  describe('updateStage', () => {
    it('calls service.updateStage with DTO and returns updated transaction', async () => {
      const dtoWithoutId: Omit<UpdateTransactionDto, 'id'> = {
        stage: TransactionStage.EARNEST_MONEY,
      } as any;
      mockService.updateStage!.mockResolvedValue({
        ...sampleTransaction,
        stage: TransactionStage.EARNEST_MONEY,
      });

      const res = await controller.updateStage(sampleTransaction._id as string, dtoWithoutId);

      expect(mockService.updateStage).toHaveBeenCalledWith({
        id: sampleTransaction._id,
        stage: TransactionStage.EARNEST_MONEY,
      });
      expect(res.stage).toBe(TransactionStage.EARNEST_MONEY);
    });

    it('propagates service errors from updateStage', async () => {
      const dtoWithoutId: Omit<UpdateTransactionDto, 'id'> = {
        stage: TransactionStage.EARNEST_MONEY,
      } as any;
      mockService.updateStage!.mockRejectedValue(
        new Error('invalid transition'),
      );

      await expect(
        controller.updateStage('missing', dtoWithoutId),
      ).rejects.toThrow('invalid transition');
    });
  });
});
