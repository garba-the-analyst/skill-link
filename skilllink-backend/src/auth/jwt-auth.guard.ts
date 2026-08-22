// skilllink-backend/src/auth/jwt-auth.guard.ts
//
// Verifies the `Authorization: Bearer <token>` header on a request and
// attaches its payload ({ sub, email, role }) to request.user for
// downstream guards (RolesGuard) and controllers to read.
//
// Apply with @UseGuards(JwtAuthGuard) on any route that requires a
// logged-in user; request.user.sub is that user's id.
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedRequestUser {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret = process.env.JWT_SECRET || 'fallbackDevSecretKey';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header.');
    }

    const token = authHeader.slice('Bearer '.length).trim();

    try {
      const payload = jwt.verify(token, this.jwtSecret) as AuthenticatedRequestUser;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
  }
}
