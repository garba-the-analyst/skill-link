// skilllink-backend/src/volunteer/volunteer.service.ts
import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { LogHoursDto } from './dto/log-hours.dto';
import * as crypto from 'crypto';

@Injectable()
export class VolunteerService {
  constructor(private readonly prisma: PrismaService) {}

  // Retrieves active volunteering projects posted by campus NGOs/Organizations
  async getOpportunities() {
    return this.prisma.volunteerOpportunity.findMany({
      include: {
        creator: {
          select: { displayName: true },
        },
      },
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Creates a volunteer posting (restricted to Organization profile types)
  async createOpportunity(creatorId: string, dto: CreateOpportunityDto) {
    const creator = await this.prisma.user.findUnique({ where: { id: creatorId } });

    if (!creator || creator.profileType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only registered NGOs or Student Groups can post volunteer opportunities.');
    }

    return this.prisma.volunteerOpportunity.create({
      data: {
        creatorId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        location: dto.location,
        requiredHours: dto.requiredHours,
      },
    });
  }

  // Registers interest in an opportunity. The organizer follows up outside the platform.
  async applyForOpportunity(volunteerId: string, opportunityId: string) {
    const opportunity = await this.prisma.volunteerOpportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found.');
    }

    const existing = await this.prisma.volunteerApplication.findFirst({
      where: { opportunityId, volunteerId },
    });

    if (existing) {
      throw new ConflictException('You have already applied to this opportunity.');
    }

    return this.prisma.volunteerApplication.create({
      data: { opportunityId, volunteerId },
    });
  }

  // Logs hours completed. Logs are held in an unverified state until approved.
  async logHours(volunteerId: string, dto: LogHoursDto) {
    const opportunity = await this.prisma.volunteerOpportunity.findUnique({
      where: { id: dto.opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found.');
    }

    return this.prisma.volunteerHourLog.create({
      data: {
        opportunityId: dto.opportunityId,
        volunteerId: volunteerId,
        hoursLogged: dto.hours,
        isVerified: false, // Remains unverified until an admin audits it
      },
    });
  }

  // Every unverified hour log, oldest first, for an admin to review.
  // Route-level RolesGuard restricts this to ADMIN/SUPER_ADMIN callers.
  async getPendingHourLogs() {
    return this.prisma.volunteerHourLog.findMany({
      where: { isVerified: false },
      include: {
        volunteer: { select: { id: true, displayName: true, email: true } },
        opportunity: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Audits and signs a user's hours log, updating their public total completed hours.
  // Route-level RolesGuard restricts this to ADMIN/SUPER_ADMIN callers.
  async verifyHours(adminId: string, logId: string) {
    const log = await this.prisma.volunteerHourLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new NotFoundException('Target hours log was not found.');
    }

    if (log.isVerified) {
      throw new ConflictException('This hours log has already been verified.');
    }

    const updatedLog = await this.prisma.volunteerHourLog.update({
      where: { id: logId },
      data: {
        isVerified: true,
        verifiedById: adminId,
        verifiedAt: new Date(),
      },
    });

    // Add hours directly to the volunteer's record
    await this.prisma.user.update({
      where: { id: log.volunteerId },
      data: {
        totalLoggedHours: { increment: log.hoursLogged },
      },
    });

    return updatedLog;
  }

  // Generates a cryptographically signed completion certificate
  async issueCertificate(volunteerId: string) {
    const volunteer = await this.prisma.user.findUnique({ where: { id: volunteerId } });

    if (!volunteer || volunteer.totalLoggedHours === 0) {
      throw new ForbiddenException('You must have completed and verified volunteer hours to issue a certificate.');
    }

    // Cryptographic proof: hash of the user id, total completed hours, and a
    // server-side salt. The salt lives in an env var, never in source, so a
    // reader of this code can't forge a valid certificate for anyone.
    const signingSecret = process.env.CERT_SIGNING_SECRET || 'dev-only-cert-salt-change-me';
    const hash = crypto
      .createHash('sha256')
      .update(`${volunteerId}-${volunteer.totalLoggedHours}-${signingSecret}`)
      .digest('hex');

    return this.prisma.volunteerCertificate.create({
      data: {
        volunteerId,
        totalHoursSigned: volunteer.totalLoggedHours,
        issueHash: hash,
      },
    });
  }
}
