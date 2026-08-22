// skilllink-backend/src/escrow/escrow.module.ts
import { Module } from '@nestjs/common';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';

// PrismaService comes from the global PrismaModule — no need to list it here.
@Module({
  controllers: [EscrowController],
  providers: [EscrowService],
})
export class EscrowModule {}
