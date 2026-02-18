import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../enums/role.enum';
import type { AuthUser } from '../../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user?: AuthUser;
}

/**
 * Guard that restricts access to administrators only.
 * Must be used after JwtAuthGuard so req.user is set.
 *
 * Use on controllers or handlers that only admins may access (read or write).
 *
 * @example
 *   @UseGuards(JwtAuthGuard, AdminGuard)
 *   @Controller('admin')
 *   export class AdminController { ... }
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Access denied. Authentication required.');
    }

    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access denied. This action is restricted to administrators.',
      );
    }

    return true;
  }
}
