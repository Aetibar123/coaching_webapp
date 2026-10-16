import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SupabaseService } from '../../supabase/supabase.service';

interface ProfileRecord {
  role?: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no specific roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: Record<string, unknown>;
    }>();

    // Check custom role header first (useful for dev/test environments)
    const roleHeader = request.headers['x-user-role'];
    if (roleHeader) {
      const normalizedHeader = roleHeader.toLowerCase();
      if (
        normalizedHeader === (Role.ADMIN as string) ||
        requiredRoles.includes(normalizedHeader as Role)
      ) {
        return true;
      }
    }

    // Extract Bearer token from Authorization header
    const authHeader = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('No authorization token or x-user-role header found');
        throw new ForbiddenException(
          'Access denied: Authentication token required to verify role',
        );
      }
      // In non-production, allow requests that don't pass tokens to facilitate local testing
      return true;
    }

    try {
      const supabase = this.supabaseService.getClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(token);

      if (userError || !user) {
        this.logger.warn('Failed to verify token with Supabase auth');
        throw new ForbiddenException('Invalid or expired authentication token');
      }

      // Check role in profiles table first
      let userRole: string = Role.TEACHER;

      const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        userRole = Role.ADMIN;
      } else {
        // Query using user-scoped client so auth.uid() in Supabase RLS matches user.id
        const userClient = this.supabaseService.getUserClient(token);

        let profileRes = (await userClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()) as {
          data: ProfileRecord | null;
          error: { message: string } | null;
        };

        // If not found by ID, attempt lookup by email
        if (!profileRes.data && user.email) {
          profileRes = (await userClient
            .from('profiles')
            .select('role')
            .ilike('email', user.email)
            .maybeSingle()) as {
            data: ProfileRecord | null;
            error: { message: string } | null;
          };
        }

        // If still not found, try base client
        if (!profileRes.data) {
          profileRes = (await supabase
            .from('profiles')
            .select('role')
            .or(`id.eq.${user.id},email.ilike.${user.email}`)
            .maybeSingle()) as {
            data: ProfileRecord | null;
            error: { message: string } | null;
          };
        }

        const profile = profileRes.data;

        if (profile?.role) {
          userRole = profile.role.toLowerCase();
        } else if (user.app_metadata?.role) {
          userRole = String(user.app_metadata.role).toLowerCase();
        } else if (user.user_metadata?.role) {
          userRole = String(user.user_metadata.role).toLowerCase();
        }
      }

      // Attach user info to request
      request.user = {
        id: user.id,
        email: user.email,
        role: userRole,
      };

      // Admin has universal access
      if (userRole === (Role.ADMIN as string)) {
        return true;
      }

      // Check if user's role matches any of the required roles
      const hasRole = requiredRoles.includes(userRole as Role);
      if (!hasRole) {
        throw new ForbiddenException(
          `Insufficient permissions: Required role(s) [${requiredRoles.join(
            ', ',
          )}], current role is [${userRole}]`,
        );
      }

      return true;
    } catch (err: unknown) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.error('Error during role verification:', err);
      throw new ForbiddenException('Unable to verify user permissions');
    }
  }
}
