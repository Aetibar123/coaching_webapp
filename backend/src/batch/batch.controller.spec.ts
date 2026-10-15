import { Test, TestingModule } from '@nestjs/testing';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';

describe('BatchController', () => {
  let controller: BatchController;

  const mockBatchService = {
    createBatch: jest.fn(),
    findAllBatches: jest.fn(),
    findBatchById: jest.fn(),
    updateBatch: jest.fn(),
    deleteBatch: jest.fn(),
    getBatchStudents: jest.fn(),
    addStudentToBatch: jest.fn(),
    removeStudentFromBatch: jest.fn(),
    getBatchStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchController],
      providers: [
        {
          provide: BatchService,
          useValue: mockBatchService,
        },
      ],
    }).compile();

    controller = module.get<BatchController>(BatchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
