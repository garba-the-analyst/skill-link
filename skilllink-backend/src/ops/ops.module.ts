// skilllink-backend/src/ops/ops.module.ts
import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';

// PrismaService comes from the global PrismaModule — no need to list it here.
@Module({
  controllers: [OpsController],
})
export class OpsModule {}
