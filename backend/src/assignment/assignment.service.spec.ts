import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentService } from './assignment.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('AssignmentService', () => {
  let service: AssignmentService;

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

