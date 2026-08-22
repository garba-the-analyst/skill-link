// skilllink-backend/src/escrow/escrow.service.ts
//
// Escrow lifecycle for a booking:
//   LOCKED        Student paid; funds held by the platform.
//   IN_PROGRESS   Provider started the job (providerStart).
//   RELEASE_READY Provider marked the job done (providerComplete); a fresh
//                 6-digit OTP was generated and stored on the booking.
//   COMPLETED     Student entered the correct OTP (authorizeRelease); the
//                 provider's balance is credited, net of the platform fee.
import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

const PLATFORM_FEE_RATE = 0.1; // 10% facilitation fee

function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

@Injectable()
export class EscrowService {
  constructor(private readonly prisma: PrismaService) {}

  // Initiates a secure escrow transaction. Student locks the funds into the platform.
  async createBooking(studentId: string, dto: CreateBookingDto) {
    const listing = await this.prisma.serviceListing.findUnique({
      where: { id: dto.listingId },
    });

    if (!listing) {
      throw new NotFoundException('The requested service listing was not found.');
    }

    if (listing.providerId === studentId) {
      throw new BadRequestException('You cannot book your own listing.');
    }

    const escrowFeeCents = Math.round(dto.amountCents * PLATFORM_FEE_RATE);

    return this.prisma.booking.create({
      data: {
        listingId: dto.listingId,
        studentId,
        providerId: listing.providerId,
        amountCents: dto.amountCents,
        escrowFeeCents,
        status: 'LOCKED', // Funds are locked immediately on booking
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: 24h helper
      },
    });
  }

  // All bookings where the caller is either the paying student or the provider.
  async findMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { OR: [{ studentId: userId }, { providerId: userId }] },
      include: {
        listing: { select: { id: true, title: true } },
        student: { select: { id: true, displayName: true } },
        provider: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // A single booking's detail — only visible to its student, its provider, or an admin.
  async findBookingById(userId: string, userRole: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { id: true, title: true } },
        student: { select: { id: true, displayName: true } },
        provider: { select: { id: true, displayName: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('The requested escrow transaction does not exist.');
    }

    const isParty = booking.studentId === userId || booking.providerId === userId;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isParty && !isAdmin) {
      throw new ForbiddenException('You do not have access to this booking.');
    }

    // Never send the live OTP to the student's own device before they've
    // asked the provider for it out loud — it's meant to move person-to-person.
    const { otpCode, ...safeBooking } = booking;
    return { ...safeBooking, otpRevealedToCaller: userId === booking.providerId ? otpCode : undefined };
  }

  // Provider marks the job as started: LOCKED -> IN_PROGRESS.
  async providerStart(providerId: string, bookingId: string) {
    const booking = await this.getOwnedByProvider(providerId, bookingId);

    if (booking.status !== 'LOCKED') {
      throw new BadRequestException(`This booking is already "${booking.status}".`);
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  // Provider marks the job as finished: IN_PROGRESS -> RELEASE_READY.
  // Generates a fresh 6-digit code for the provider to share with the student.
  async providerComplete(providerId: string, bookingId: string) {
    const booking = await this.getOwnedByProvider(providerId, bookingId);

    if (booking.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Mark the booking as started before marking it complete.');
    }

    const otpCode = generateOtp();

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'RELEASE_READY', otpCode },
    });

    // In a deployment with email/SMS configured, this code would be sent to
    // the student directly instead of being returned here. Until then, the
    // provider shares it with the student in person to complete the handshake.
    return { ...updated, otpCode };
  }

  // Student submits the OTP the provider shared: RELEASE_READY -> COMPLETED.
  // Credits the provider's balance, net of the platform fee.
  async authorizeRelease(studentId: string, bookingId: string, otp: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
      throw new NotFoundException('The requested escrow transaction does not exist.');
    }

    if (booking.studentId !== studentId) {
      throw new ForbiddenException(
        'Only the student who booked this service can authorize the fund release.',
      );
    }

    if (booking.status === 'COMPLETED') {
      throw new BadRequestException('This escrow transaction has already been completed.');
    }

    if (booking.status !== 'RELEASE_READY') {
      throw new BadRequestException(
        'The provider needs to mark this job as complete before you can release payment.',
      );
    }

    if (!booking.otpCode || otp !== booking.otpCode) {
      throw new BadRequestException('The verification code is incorrect. Please double check.');
    }

    const netEarnings = booking.amountCents - booking.escrowFeeCents;

    const [completedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED', completedAt: new Date(), otpCode: null },
      }),
      this.prisma.user.update({
        where: { id: booking.providerId },
        data: {
          availableCents: { increment: netEarnings },
          totalEarnedCents: { increment: netEarnings },
          accumulatedPoints: { increment: 50 }, // Reward platform activity
        },
      }),
    ]);

    return completedBooking;
  }

  private async getOwnedByProvider(providerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
      throw new NotFoundException('The requested escrow transaction does not exist.');
    }

    if (booking.providerId !== providerId) {
      throw new ForbiddenException('Only the assigned provider can update this booking.');
    }

    return booking;
  }
}
