// skilllink-backend/src/auth/roles.guard.ts
//
// Checks the caller's role against @Roles(...) metadata on a handler.
// Always pair with JwtAuthGuard and put it second — RolesGuard reads
// request.user, which only JwtAuthGuard populates:
//   @UseGuards(JwtAuthGuard, RolesGuard)
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No specific role required, let them through
    }

    const { user } = context.switchToHttp().getRequest();

    if (user && requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException(
      `This action requires one of the following roles: ${requiredRoles.join(', ')}.`,
    );
  }
}
