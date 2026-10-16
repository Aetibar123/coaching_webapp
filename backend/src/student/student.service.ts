import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateStudentDto } from './dto/CreateStudent.dto';
import { UpdateStudentDto } from './dto/UpdateStudent.dto';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(private supabaseService: SupabaseService) {}

  async createStudent(Stdata: CreateStudentDto) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase
        .from('student')
        .insert(Stdata)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        message: 'Student created successfully',
        data,
      };
    } catch (error) {
      this.logger.error('Student Creation Error: ', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while creating the student',
      );
    }
  }

  async findAllStudent() {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase.from('student').select('*');

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        message: 'All students retrieved successfully',
        data,
      };
    } catch (error) {
      this.logger.error('Student Find All Error: ', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while finding the students',
      );
    }
  }

  async findOneStudent(id: string | number) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase
        .from('student')
        .select()
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      if (!data) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      return {
        success: true,
        message: 'Student found successfully',
        data,
      };
    } catch (error) {
      this.logger.error('Student Find One Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while finding the student',
      );
    }
  }

  async updateStudent(id: string | number, updateData: UpdateStudentDto) {
    const supabase = this.supabaseService.getClient();

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided to update',
      );
    }

    try {
      // .maybeSingle() avoids PostgREST error PGRST116 when 0 rows are found
      const { data, error } = await supabase
        .from('student')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        throw new BadRequestException(
          `Supabase Update Error: ${error.message}`,
        );
      }

      // Agar data empty hai iska matlab us ID ka student database mein nahi tha
      if (!data) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      return {
        success: true,
        message: 'Student updated successfully',
        data,
      };
    } catch (error) {
      this.logger.error('Student Update Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while updating the student',
      );
    }
  }

  async deleteStudent(id: string | number) {
    const supabase = this.supabaseService.getClient();

    try {
      // .maybeSingle() avoids PostgREST error PGRST116 when 0 rows are found
      const { data, error } = await supabase
        .from('student')
        .delete()
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        throw new BadRequestException(
          `Supabase Delete Error: ${error.message}`,
        );
      }

      if (!data) {
        throw new NotFoundException(
          `Student with ID ${id} not found to delete`,
        );
      }

      return {
        success: true,
        message: 'Student deleted successfully',
        deletedData: data,
      };
    } catch (error) {
      this.logger.error('Student Delete Error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while deleting the student',
      );
    }
  }
}
