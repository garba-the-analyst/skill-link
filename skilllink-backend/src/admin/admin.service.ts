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

  // Rich analytics for the admin dashboard — revenue, trends and activity
  async getAnalytics() {
    const [allBookings, verifiedHours, totalUsers] = await Promise.all([
      this.prisma.booking.findMany({
        include: {
          listing: { select: { title: true } },
          student: { select: { displayName: true } },
          provider: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.volunteerHourLog.findMany({
        include: {
          volunteer: { select: { displayName: true } },
          opportunity: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    const completed = allBookings.filter((b) => b.status === 'COMPLETED');
    const totalGrossCents = completed.reduce((s, b) => s + b.amountCents, 0);
    const totalFeesCents = completed.reduce((s, b) => s + b.escrowFeeCents, 0);
    const totalNetCents = totalGrossCents - totalFeesCents;
    const escrowHeldCents = allBookings
      .filter((b) => b.status !== 'COMPLETED')
      .reduce((s, b) => s + b.amountCents, 0);

    const bookingsByStatus = allBookings.reduce(
      (acc: Record<string, number>, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      },
      {},
    );

    // Monthly revenue trend for last 6 months (based on completedAt or createdAt)
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const now = new Date();
    const last6: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6.push(monthKey(d));
    }
    const revenueByMonth = last6.map((k) => {
      const filtered = completed.filter((b) => monthKey(new Date((b as any).completedAt || b.createdAt)) === k);
      return {
        month: k,
        bookings: filtered.length,
        grossCents: filtered.reduce((s: number, b: any) => s + b.amountCents, 0),
        feesCents: filtered.reduce((s: number, b: any) => s + b.escrowFeeCents, 0),
      };
    });

    // Top providers by completed bookings
    const providerMap = new Map<string, { displayName: string; bookings: number; revenueCents: number }>();
    for (const b of completed) {
      const key = b.provider.id;
      const prev = providerMap.get(key) || { displayName: b.provider.displayName, bookings: 0, revenueCents: 0 };
      prev.bookings += 1;
      prev.revenueCents += b.amountCents;
      providerMap.set(key, prev);
    }
    const topProviders = [...providerMap.entries()]
      .map(([providerId, v]) => ({ providerId, ...v }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 5);

    // Recent activity merged and sorted
    const recentBookings = allBookings.slice(0, 8).map((b) => ({
      type: 'booking' as const,
      id: b.id,
      title: `${b.student.displayName} → ${b.listing.title} (${b.status})`,
      amountCents: b.amountCents,
      status: b.status,
      createdAt: b.createdAt,
    }));
    const recentHours = verifiedHours.slice(0, 8).map((h: any) => ({
      type: 'hour_log' as const,
      id: h.id,
      title: `${h.volunteer.displayName} logged ${h.hoursLogged}h for “${h.opportunity.title}”${h.isVerified ? ' ✓' : ' (pending)'}`,
      amountCents: null,
      status: h.isVerified ? 'VERIFIED' : 'PENDING',
      createdAt: h.createdAt,
    }));
    const recentActivity = [...recentBookings, ...recentHours]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const verifiedCount = verifiedHours.filter((h: any) => h.isVerified).length;
    const pendingCount = verifiedHours.filter((h: any) => !h.isVerified).length;

    return {
      totalUsers,
      totalGrossCents,
      totalFeesCents,
      totalNetCents,
      escrowHeldCents,
      bookingsByStatus,
      revenueByMonth,
      topProviders,
      recentActivity,
      hourStats: { total: verifiedHours.length, verified: verifiedCount, pending: pendingCount },
    };
  }
}
