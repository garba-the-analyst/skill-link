import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async fetchAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        profileType: true,
        isPaidProvider: true,
        isVolunteer: true,
        identityStatus: true,
        professionalStatus: true,
        totalLoggedHours: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Every booking on the platform, for the admin activity view.
  async fetchAllBookings() {
    return this.prisma.booking.findMany({
      include: {
        listing: { select: { id: true, title: true } },
        student: { select: { id: true, displayName: true, email: true } },
        provider: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Small platform-health snapshot for the admin dashboard.
  async getStats() {
    const [userCount, listingCount, activeBookingCount, pendingHourLogCount, opportunityCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.serviceListing.count(),
        this.prisma.booking.count({ where: { status: { not: 'COMPLETED' } } }),
        this.prisma.volunteerHourLog.count({ where: { isVerified: false } }),
        this.prisma.volunteerOpportunity.count({ where: { status: 'ACTIVE' } }),
      ]);

    return { userCount, listingCount, activeBookingCount, pendingHourLogCount, opportunityCount };
  }
}
