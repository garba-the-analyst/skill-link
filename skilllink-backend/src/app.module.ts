// skilllink-backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { EscrowModule } from './escrow/escrow.module';
import { VolunteerModule } from './volunteer/volunteer.module';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { OpsModule } from './ops/ops.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AuthModule,
    MarketplaceModule,
    EscrowModule,
    VolunteerModule,
    PrismaModule,
    AdminModule,
    OpsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}