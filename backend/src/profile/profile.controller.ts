import { Controller, Get, Patch, Body, Param, Headers } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { Role } from '../common/enums/role.enum';
import { Roles } from '../common/decorators/roles.decorator';

class UpdateRoleDto {
  role!: Role;
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Get current user profile and role
   * GET /profile/me
   */
  @Get('me')
  async getMyProfile(
    @Headers('authorization') authHeader?: string,
    @Headers('x-user-id') userIdHeader?: string,
    @Headers('x-user-email') userEmailHeader?: string,
    @Headers('x-user-name') userNameHeader?: string,
  ) {
    const userId = userIdHeader || 'current-user';
    return this.profileService.getProfile(
      userId,
      userEmailHeader,
      userNameHeader,
    );
  }

  /**
   * List all user profiles
   * GET /profile
   */
  @Get()
  @Roles(Role.ADMIN)
  async findAllProfiles() {
    return this.profileService.findAllProfiles();
  }

  /**
   * Update user role (Admin only)
   * PATCH /profile/:id/role
   */
  @Patch(':id/role')
  @Roles(Role.ADMIN)
  async updateRole(
    @Param('id') userId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.profileService.updateRole(userId, updateRoleDto.role);
  }
}
