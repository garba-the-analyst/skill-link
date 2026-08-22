// skilllink-backend/src/volunteer/volunteer.controller.ts
import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { VolunteerService } from './volunteer.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { LogHoursDto } from './dto/log-hours.dto';
import { JwtAuthGuard, AuthenticatedRequestUser } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('volunteer')
export class VolunteerController {
  constructor(private readonly volunteerService: VolunteerService) {}

  // Public — anyone can browse open opportunities without signing in.
  @Get('opportunities')
  async getOpportunities() {
    return this.volunteerService.getOpportunities();
  }

  @UseGuards(JwtAuthGuard)
  @Post('opportunities')
  async createOpportunity(
    @Req() req: { user: AuthenticatedRequestUser },
    @Body() dto: CreateOpportunityDto,
  ) {
    return this.volunteerService.createOpportunity(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('opportunities/:id/apply')
  async applyForOpportunity(
    @Req() req: { user: AuthenticatedRequestUser },
    @Param('id') opportunityId: string,
  ) {
    return this.volunteerService.applyForOpportunity(req.user.sub, opportunityId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('log-hours')
  async logHours(@Req() req: { user: AuthenticatedRequestUser }, @Body() dto: LogHoursDto) {
    return this.volunteerService.logHours(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('hour-logs/pending')
  async getPendingHourLogs() {
    return this.volunteerService.getPendingHourLogs();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('verify-hours/:logId')
  async verifyHours(@Req() req: { user: AuthenticatedRequestUser }, @Param('logId') logId: string) {
    return this.volunteerService.verifyHours(req.user.sub, logId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('certificates/generate')
  async generateCertificate(@Req() req: { user: AuthenticatedRequestUser }) {
    return this.volunteerService.issueCertificate(req.user.sub);
  }
}
