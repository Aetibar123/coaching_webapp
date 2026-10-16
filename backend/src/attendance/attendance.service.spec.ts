import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { SupabaseService } from '../supabase/supabase.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubmitAttendanceDto } from './attendance.dto';

interface MockQueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  in: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;
}

describe('AttendanceService', () => {
  let service: AttendanceService;
  let mockSupabase: { from: jest.Mock };

  beforeEach(async () => {
    mockSupabase = {
      from: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabase),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitAttendance', () => {
    it('should reject submission with duplicate student IDs', async () => {
      const dto: SubmitAttendanceDto = {
        batch_id: 'batch-1',
        date: '2026-10-17',
        students: [
          { student_id: 'student-1', status: 'present' },
          { student_id: 'student-1', status: 'absent' },
        ],
      };

      await expect(service.submitAttendance(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if batch does not exist', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'batch') {
          const builder: Partial<MockQueryBuilder> = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          };
          return builder;
        }
        return {};
      });

      const dto: SubmitAttendanceDto = {
        batch_id: 'non-existent-batch',
        date: '2026-10-17',
        students: [{ student_id: 'student-1', status: 'present' }],
      };

      await expect(service.submitAttendance(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if a student belongs to another batch', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'batch') {
          const builder: Partial<MockQueryBuilder> = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'batch-1', name: 'Batch 1' },
              error: null,
            }),
          };
          return builder;
        }
        if (table === 'student') {
          const builder: Partial<MockQueryBuilder> = {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [
                { id: 'student-1', name: 'Alice', batch_id: 'other-batch' },
              ],
              error: null,
            }),
          };
          return builder;
        }
        return {};
      });

      const dto: SubmitAttendanceDto = {
        batch_id: 'batch-1',
        date: '2026-10-17',
        students: [{ student_id: 'student-1', status: 'present' }],
      };

      await expect(service.submitAttendance(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully transform and bulk insert valid attendance records', async () => {
      const insertedRows = [
        {
          student_id: 'student-1',
          batch_id: 'batch-1',
          date: '2026-10-17',
          status: 'present',
        },
        {
          student_id: 'student-2',
          batch_id: 'batch-1',
          date: '2026-10-17',
          status: 'absent',
        },
      ];

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: insertedRows,
          error: null,
        }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'batch') {
          const builder: Partial<MockQueryBuilder> = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'batch-1', name: 'Batch 1' },
              error: null,
            }),
          };
          return builder;
        }
        if (table === 'student') {
          const builder: Partial<MockQueryBuilder> = {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [
                { id: 'student-1', name: 'Alice', batch_id: 'batch-1' },
                { id: 'student-2', name: 'Bob', batch_id: 'batch-1' },
              ],
              error: null,
            }),
          };
          return builder;
        }
        if (table === 'attendance') {
          return {
            insert: insertMock,
          };
        }
        return {};
      });

      const dto: SubmitAttendanceDto = {
        batch_id: 'batch-1',
        date: '2026-10-17',
        students: [
          { student_id: 'student-1', status: 'present' },
          { student_id: 'student-2', status: 'ABSENT' },
        ],
      };

      const result = await service.submitAttendance(dto);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(insertMock).toHaveBeenCalledWith([
        {
          student_id: 'student-1',
          batch_id: 'batch-1',
          date: '2026-10-17',
          status: 'present',
        },
        {
          student_id: 'student-2',
          batch_id: 'batch-1',
          date: '2026-10-17',
          status: 'absent',
        },
      ]);
    });

    it('should handle unique constraint database errors properly', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'batch') {
          const builder: Partial<MockQueryBuilder> = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'batch-1', name: 'Batch 1' },
              error: null,
            }),
          };
          return builder;
        }
        if (table === 'student') {
          const builder: Partial<MockQueryBuilder> = {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'student-1', name: 'Alice', batch_id: 'batch-1' }],
              error: null,
            }),
          };
          return builder;
        }
        if (table === 'attendance') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: null,
                error: {
                  code: '23505',
                  message: 'duplicate key value violates unique constraint',
                },
              }),
            }),
          };
        }
        return {};
      });

      const dto: SubmitAttendanceDto = {
        batch_id: 'batch-1',
        date: '2026-10-17',
        students: [{ student_id: 'student-1', status: 'present' }],
      };

      await expect(service.submitAttendance(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
