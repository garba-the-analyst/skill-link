// skilllink-backend/src/marketplace/marketplace.module.ts
import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

// PrismaService comes from the global PrismaModule — no need to list it here.
@Module({
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
