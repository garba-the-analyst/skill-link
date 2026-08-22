// skilllink-backend/src/marketplace/marketplace.controller.ts
import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { JwtAuthGuard, AuthenticatedRequestUser } from '../auth/jwt-auth.guard';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('feed')
  async getFeed() {
    return this.marketplaceService.getFeed();
  }

  @UseGuards(JwtAuthGuard)
  @Post('listings')
  async createListing(
    @Req() req: { user: AuthenticatedRequestUser },
    @Body() dto: CreateListingDto,
  ) {
    return this.marketplaceService.createListing(req.user.sub, dto);
  }
}
