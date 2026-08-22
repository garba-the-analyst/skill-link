// skilllink-backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// PrismaService doesn't need to be listed here — PrismaModule is @Global()
// and already exports it (see prisma/prisma.module.ts), so every module
// shares the same PrismaService instance and database connection.
@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}