import {
  Injectable,
  Logger,
  HttpException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { handlePrismaError } from '../common/helpers/prisma-error.handler';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { PaginationQueryDto } from '../common/dto/pagination.dto';
import type { Role } from '../common/enums/role.enum';

// ---------------------------------------------------------------------------
// Shared select shape — password is intentionally excluded from every query
// that returns data to the caller. Using 'select' instead of 'omit' keeps us
// compatible with all Prisma v5 versions (omit requires a preview flag).
// ---------------------------------------------------------------------------
const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  emailVerifiedAt: true,
  userType: true,
  incomeSources: true,
  onboardingCompleted: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Minimal user shape used across this service (decoupled from generated Prisma types). */
export interface UserEntity {
  id: string;
  email: string;
  password: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  emailVerifiedAt: Date | null;
  emailVerificationTokenHash: string | null;
  emailVerificationTokenExpiresAt: Date | null;
  emailVerificationCodeHash: string | null;
  userType: string | null;
  incomeSources: unknown;
  onboardingCompleted: boolean;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A user object that never contains the password hash. */
export type SafeUser = Pick<
  UserEntity,
  | 'id'
  | 'email'
  | 'name'
  | 'avatarUrl'
  | 'role'
  | 'emailVerifiedAt'
  | 'userType'
  | 'incomeSources'
  | 'onboardingCompleted'
  | 'suspendedAt'
  | 'createdAt'
  | 'updatedAt'
>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Local adapter so this module doesn't depend on generated Prisma namespace types.
   * This preserves runtime behavior while avoiding TS export mismatches.
   */
  private get db(): {
    user: {
      findUnique(args: unknown): Promise<any>;
      findFirst(args: unknown): Promise<any>;
      findMany(args: unknown): Promise<any[]>;
      count(args?: unknown): Promise<number>;
      create(args: unknown): Promise<any>;
      update(args: unknown): Promise<any>;
      delete(args: unknown): Promise<any>;
    };
    $transaction<T>(args: Promise<any>[]): Promise<T>;
  } {
    return this.prisma as unknown as {
      user: {
        findUnique(args: unknown): Promise<any>;
        findFirst(args: unknown): Promise<any>;
        findMany(args: unknown): Promise<any[]>;
        count(args?: unknown): Promise<number>;
        create(args: unknown): Promise<any>;
        update(args: unknown): Promise<any>;
        delete(args: unknown): Promise<any>;
      };
      $transaction<T>(args: Promise<any>[]): Promise<T>;
    };
  }

  // ─── Helpers used by AuthService ─────────────────────────────────────────

  /**
   * Look up a user by their email address.
   * Returns the full User record (including password hash) so AuthService
   * can run bcrypt.compare. Password must NOT be forwarded to the client.
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      return await this.db.user.findUnique({ where: { email } });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.findByEmail');
    }
  }

  /**
   * Look up a user by their primary key.
   * Returns the full record so JwtStrategy can build the req.user object
   * and strip the password itself.
   */
  async findById(id: string): Promise<UserEntity | null> {
    try {
      return await this.db.user.findUnique({ where: { id } });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.findById');
    }
  }

  /**
   * Insert a new user row. The password supplied here must already be hashed
   * by the caller (AuthService) — this method never hashes anything itself.
   */
  async create(data: {
    email: string;
    password: string;
    name?: string;
  }): Promise<UserEntity> {
    try {
      return await this.db.user.create({ data });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.create');
    }
  }

  // ─── Admin operations ─────────────────────────────────────────────────────

  /**
   * Return a paginated, optionally filtered list of all users.
   *
   * - `page` and `limit` control the offset window.
   * - `search` does a case-insensitive partial match on both name and email.
   *
   * Passwords are excluded via the shared USER_SAFE_SELECT constant.
   */
  async findAll(query: PaginationQueryDto): Promise<{
    users: SafeUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;

      // Build a reusable 'where' clause — only add the search filter when the
      // caller actually provides a search term.
      const where = query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : undefined;

      // Run both queries inside a transaction so the total stays consistent
      // even if another request inserts a row between the two queries.
      const [users, total] = await this.db.$transaction<[SafeUser[], number]>([
        this.db.user.findMany({
          where,
          select: USER_SAFE_SELECT,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.db.user.count({ where }),
      ]);

      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.findAll');
    }
  }

  /**
   * Fetch a single user by ID, excluding the password.
   * Throws NotFoundException (404) if no record is found so callers never
   * have to write their own existence checks.
   */
  async findOneOrFail(id: string): Promise<SafeUser> {
    try {
      const user = await this.db.user.findUnique({
        where: { id },
        select: USER_SAFE_SELECT,
      });

      if (!user) {
        throw new NotFoundException(`User with id "${id}" was not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.findOneOrFail');
    }
  }

  /**
   * Fetch a single user by ID with summary stats (transaction, budget, goal counts).
   * Used by admin "view user details" to show full profile and activity summary.
   */
  async findOneWithDetails(id: string): Promise<SafeUser & { stats: { transactionCount: number; budgetCount: number; goalCount: number } }> {
    try {
      const user = await this.findOneOrFail(id);

      const prisma = this.prisma as any;
      const [transactionCount, budgetCount, goalCount] = await Promise.all([
        prisma.transaction.count({ where: { userId: id } }),
        prisma.budget.count({ where: { userId: id } }),
        prisma.goal.count({ where: { userId: id } }),
      ]);

      return {
        ...user,
        stats: { transactionCount, budgetCount, goalCount },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.findOneWithDetails');
    }
  }

  /**
   * Update a user's name and/or role.
   *
   * Safety rules enforced here (not in the controller) so they apply
   * regardless of how this method is called:
   *  - An admin cannot change their own role (prevents accidental self-lockout).
   *  - The target user must exist (delegates to findOneOrFail).
   */
  async updateUser(
    targetId: string,
    requesterId: string,
    dto: UpdateUserDto,
  ): Promise<SafeUser> {
    try {
      // Confirm the target exists before attempting the update
      await this.findOneOrFail(targetId);

      // Prevent an admin from locking themselves out by demoting their own account
      if (dto.role !== undefined && targetId === requesterId) {
        throw new ForbiddenException(
          'You cannot change your own role. Ask another admin to do this.',
        );
      }

      const updated = await this.db.user.update({
        where: { id: targetId },
        data: dto,
        select: USER_SAFE_SELECT,
      });

      this.logger.log(
        `Admin [${requesterId}] updated user [${targetId}] — changes: ${JSON.stringify(dto)}`,
      );

      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.updateUser');
    }
  }

  /**
   * Permanently delete a user.
   *
   * Safety rules:
   *  - An admin cannot delete their own account.
   *  - The target user must exist (delegates to findOneOrFail).
   *
   * Related records (transactions, budgets, goals) are removed automatically
   * via the Cascade delete rules defined in the Prisma schema.
   */
  async deleteUser(targetId: string, requesterId: string): Promise<void> {
    try {
      if (targetId === requesterId) {
        throw new ForbiddenException(
          'You cannot delete your own account. Ask another admin to do this.',
        );
      }
      await this.findOneOrFail(targetId);
      await this.db.user.delete({ where: { id: targetId } });
      this.logger.log(
        `Admin [${requesterId}] permanently deleted user [${targetId}]`,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.deleteUser');
    }
  }

  /**
   * Suspend a user account. Suspended users cannot log in or use existing tokens.
   * Admins cannot suspend their own account.
   */
  async suspendUser(targetId: string, requesterId: string): Promise<SafeUser> {
    try {
      if (targetId === requesterId) {
        throw new ForbiddenException(
          'You cannot suspend your own account. Ask another admin to do this.',
        );
      }
      const user = await this.findOneOrFail(targetId);
      if (user.suspendedAt) {
        throw new BadRequestException('This account is already suspended.');
      }
      const updated = await this.db.user.update({
        where: { id: targetId },
        data: { suspendedAt: new Date() },
        select: USER_SAFE_SELECT,
      });
      this.logger.log(`Admin [${requesterId}] suspended user [${targetId}]`);
      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.suspendUser');
    }
  }

  /**
   * Unsuspend (reactivate) a user account.
   * Admins cannot unsuspend their own account (no-op if self; we still forbid for consistency).
   */
  async unsuspendUser(targetId: string, requesterId: string): Promise<SafeUser> {
    try {
      if (targetId === requesterId) {
        throw new ForbiddenException(
          'You cannot change suspension status on your own account.',
        );
      }
      const user = await this.findOneOrFail(targetId);
      if (!user.suspendedAt) {
        throw new BadRequestException('This account is not suspended.');
      }
      const updated = await this.db.user.update({
        where: { id: targetId },
        data: { suspendedAt: null },
        select: USER_SAFE_SELECT,
      });
      this.logger.log(`Admin [${requesterId}] unsuspended user [${targetId}]`);
      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.unsuspendUser');
    }
  }

  /**
   * Update the avatar URL for a specific user.
   * Used by the profile-picture upload flow.
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<SafeUser> {
    try {
      const updatedUser = await this.db.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: USER_SAFE_SELECT,
      });
      return updatedUser;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.updateAvatar');
    }
  }

  async setEmailVerificationToken(
    userId: string,
    tokenHash: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void> {
    try {
      await this.db.user.update({
        where: { id: userId },
        data: {
          emailVerificationTokenHash: tokenHash,
          emailVerificationCodeHash: codeHash,
          emailVerificationTokenExpiresAt: expiresAt,
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.setEmailVerificationToken');
    }
  }

  async findByVerificationToken(email: string, tokenHash: string): Promise<UserEntity | null> {
    try {
      return await this.db.user.findFirst({
        where: {
          email,
          emailVerificationTokenHash: tokenHash,
          emailVerificationTokenExpiresAt: { gt: new Date() },
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.findByVerificationToken');
    }
  }

  async findByVerificationCode(
    email: string,
    codeHash: string,
  ): Promise<UserEntity | null> {
    try {
      return await this.db.user.findFirst({
        where: {
          email,
          emailVerificationCodeHash: codeHash,
          emailVerificationTokenExpiresAt: { gt: new Date() },
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.findByVerificationCode');
    }
  }

  async markEmailVerified(userId: string): Promise<SafeUser> {
    try {
      return await this.db.user.update({
        where: { id: userId },
        data: {
          emailVerifiedAt: new Date(),
          emailVerificationTokenHash: null,
          emailVerificationCodeHash: null,
          emailVerificationTokenExpiresAt: null,
        },
        select: USER_SAFE_SELECT,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.markEmailVerified');
    }
  }

  async completeOnboarding(
    userId: string,
    data: { userType: string; incomeSources: string[] },
  ): Promise<SafeUser> {
    try {
      return await this.db.user.update({
        where: { id: userId },
        data: {
          userType: data.userType,
          incomeSources: data.incomeSources,
          onboardingCompleted: true,
        },
        select: USER_SAFE_SELECT,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.completeOnboarding');
    }
  }

  async clearVerificationToken(userId: string): Promise<void> {
    try {
      await this.db.user.update({
        where: { id: userId },
        data: {
          emailVerificationTokenHash: null,
          emailVerificationCodeHash: null,
          emailVerificationTokenExpiresAt: null,
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'UsersService.clearVerificationToken');
    }
  }
}
