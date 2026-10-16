import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Role } from '../common/enums/role.enum';

export interface ProfileRecord {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  created_at?: string;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Get user profile by Supabase user ID, creating one if not exists
   */
  async getProfile(userId: string, email?: string, name?: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const res = (await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()) as {
        data: ProfileRecord | null;
        error: { message: string } | null;
      };
      const { data, error } = res;

      if (error) {
        this.logger.error(`Error querying profile: ${error.message}`);
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      if (data) {
        return {
          success: true,
          data,
        };
      }

      // If profile does not exist yet, create a default profile with 'teacher' role
      const newProfile = {
        id: userId,
        email: email || 'unknown@domain.com',
        full_name: name || 'User',
        role: Role.TEACHER,
      };

      const insertRes = (await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()) as {
        data: ProfileRecord | null;
        error: { message: string } | null;
      };
      const { data: created, error: insertError } = insertRes;

      if (insertError) {
        // Fallback to returning memory profile if table has no insert permissions
        return {
          success: true,
          data: newProfile as ProfileRecord,
        };
      }

      return {
        success: true,
        data: created as ProfileRecord,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Error fetching profile:', err);
      throw new InternalServerErrorException('Failed to retrieve user profile');
    }
  }

  /**
   * List all user profiles with roles (Admins/Faculty directory)
   */
  async findAllProfiles() {
    const supabase = this.supabaseService.getClient();

    try {
      const listRes = (await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })) as {
        data: ProfileRecord[] | null;
        error: { message: string } | null;
      };
      const { data, error } = listRes;

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      return {
        success: true,
        count: data?.length ?? 0,
        data: data ?? [],
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Error listing profiles:', err);
      throw new InternalServerErrorException('Failed to list profiles');
    }
  }

  /**
   * Update a user's role (Admin only)
   */
  async updateRole(userId: string, newRole: Role) {
    if (![Role.ADMIN, Role.TEACHER].includes(newRole)) {
      throw new BadRequestException(
        `Invalid role. Must be one of: ${Role.ADMIN}, ${Role.TEACHER}`,
      );
    }

    const supabase = this.supabaseService.getClient();

    try {
      const updateRes = (await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .maybeSingle()) as {
        data: ProfileRecord | null;
        error: { message: string } | null;
      };
      const { data, error } = updateRes;

      if (error) {
        throw new BadRequestException(`Supabase Error: ${error.message}`);
      }

      if (!data) {
        throw new NotFoundException(`Profile with user ID ${userId} not found`);
      }

      return {
        success: true,
        message: `User role updated to ${newRole} successfully`,
        data,
      };
    } catch (err: unknown) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      this.logger.error('Error updating role:', err);
      throw new InternalServerErrorException('Failed to update user role');
    }
  }
}
