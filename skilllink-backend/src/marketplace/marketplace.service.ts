// skilllink-backend/src/marketplace/marketplace.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  // Retrieves all active service listings on the main campus directory feed
  async getFeed() {
    return this.prisma.serviceListing.findMany({
      include: {
        provider: {
          select: { id: true, displayName: true, avatarUrl: true, identityStatus: true },
        },
        skills: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Publishes a paid service listing after validating that the user is a registered provider
  async createListing(userId: string, dto: CreateListingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    // Safety Check: Users must toggle isPaidProvider before listing skills
    if (!user || !user.isPaidProvider) {
      throw new ForbiddenException('You must activate your Provider Profile to publish a listing.');
    }

    return this.prisma.serviceListing.create({
      data: {
        providerId: userId,
        title: dto.title,
        bio: dto.bio,
        hourlyRateCents: dto.hourlyRateCents,
        skills: {
          create: dto.skills.map((skillName) => ({ name: skillName })),
        },
      },
      include: { skills: true },
    });
  }
}