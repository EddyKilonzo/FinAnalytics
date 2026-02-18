import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
  InternalServerErrorException,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  UserListResponseDto,
  UserDetailResponseDto,
} from './dto/user-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ErrorResponseDto } from '../auth/dto/auth-response.dto';
import { MailerService } from '../common/mailer/mailer.service';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

/** Extend Express.Request so TypeScript knows req.user is an AuthUser. */
interface AuthRequest extends Express.Request {
  user: AuthUser;
}

/**
 * UsersController — Admin-only user management.
 *
 * Every route in this controller requires:
 *  1. A valid JWT Bearer token  (JwtAuthGuard)
 *  2. The authenticated user to have the ADMIN role  (RolesGuard + @Roles)
 *
 * Non-admin requests receive 401 (no token) or 403 (wrong role).
 */
@ApiTags('Users · Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
  ) {}

  // ─── GET /api/v1/users ───────────────────────────────────────────────────

  /**
   * Return a paginated list of all users.
   * Supports optional search by name or email and page/limit query params.
   */
  @Get()
  @ApiOperation({
    summary: 'List all users  [ADMIN]',
    description:
      'Returns a paginated list of users. Filter with `search` (name or email). ' +
      'Passwords are never included in the response.',
  })
  @ApiQuery({ name: 'page',   required: false, type: Number, example: 1  })
  @ApiQuery({ name: 'limit',  required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'jane' })
  @ApiResponse({ status: 200, description: 'Paginated user list.', type: UserListResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.',   type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Requires ADMIN role.',        type: ErrorResponseDto })
  async findAll(@Query() query: PaginationQueryDto) {
    try {
      const { users, total, page, limit, totalPages } =
        await this.usersService.findAll(query);

      return {
        success: true,
        data: users,
        meta: { total, page, limit, totalPages },
      };
    } catch (error) {
      // Re-throw known HTTP exceptions (403, 404, etc.) so the global filter
      // returns them with the correct status code.
      if (error instanceof HttpException) throw error;

      // Anything else is unexpected — log the full stack but tell the client
      // only a safe, generic message.
      this.logger.error(
        'Unexpected error in findAll',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not retrieve users. Please try again.');
    }
  }

  // ─── GET /api/v1/users/:id ───────────────────────────────────────────────

  /**
   * Return a single user by their CUID.
   * Responds with 404 if the ID does not match any user.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a user by ID  [ADMIN]',
    description: 'Returns one user record. Password is excluded.',
  })
  @ApiParam({ name: 'id', description: 'User CUID', example: 'cuid123abc' })
  @ApiResponse({ status: 200, description: 'User found.',       type: UserDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated.',  type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Requires ADMIN.',   type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'User not found.',   type: ErrorResponseDto })
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.usersService.findOneOrFail(id);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `Unexpected error fetching user [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not retrieve user. Please try again.');
    }
  }

  // ─── PATCH /api/v1/users/:id ─────────────────────────────────────────────

  /**
   * Update a user's name and/or role.
   *
   * Enforced safety rules (handled in the service layer):
   *  - Admins cannot change their own role.
   *  - Target user must exist.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a user  [ADMIN]',
    description:
      'Update `name` and/or `role`. ' +
      'Admins **cannot** change their own role to prevent accidental self-lockout.',
  })
  @ApiParam({ name: 'id', description: 'User CUID', example: 'cuid123abc' })
  @ApiResponse({ status: 200, description: 'User updated.',                          type: UserDetailResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.',                     type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Requires ADMIN or self-role change.',    type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'User not found.',                        type: ErrorResponseDto })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: AuthRequest,
  ) {
    try {
      const beforeUpdate = await this.usersService.findOneOrFail(id);
      const data = await this.usersService.updateUser(id, req.user.id, dto);

      if (dto.role && dto.role !== beforeUpdate.role) {
        await this.mailerService.sendRoleChangedEmail({
          to: data.email,
          name: data.name,
          newRole: dto.role,
        });
      }

      return { success: true, message: 'User updated successfully', data };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `Unexpected error updating user [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not update user. Please try again.');
    }
  }

  // ─── DELETE /api/v1/users/:id ────────────────────────────────────────────

  /**
   * Permanently delete a user and all their associated data
   * (transactions, budgets, goals — removed via Cascade in the schema).
   *
   * Enforced safety rules:
   *  - Admins cannot delete their own account.
   *  - Target user must exist.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a user  [ADMIN]',
    description:
      'Permanently removes a user and all related records (cascade). ' +
      'An admin **cannot** delete their own account.',
  })
  @ApiParam({ name: 'id', description: 'User CUID', example: 'cuid123abc' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Requires ADMIN or self-delete attempt.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'User not found.',                        type: ErrorResponseDto })
  async deleteUser(@Param('id') id: string, @Request() req: AuthRequest) {
    try {
      const userToDelete = await this.usersService.findOneOrFail(id);
      await this.usersService.deleteUser(id, req.user.id);
      await this.mailerService.sendAccountDeletedEmail({
        to: userToDelete.email,
        name: userToDelete.name,
      });
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `Unexpected error deleting user [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not delete user. Please try again.');
    }
  }
}
