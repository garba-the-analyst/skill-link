// skilllink-backend/src/escrow/escrow.controller.ts
import { Controller, Post, Get, Param, Body, Req, UseGuards } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ReleaseEscrowDto } from './dto/release-escrow.dto';
import { JwtAuthGuard, AuthenticatedRequestUser } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post('bookings')
  async createBooking(@Req() req: { user: AuthenticatedRequestUser }, @Body() dto: CreateBookingDto) {
    return this.escrowService.createBooking(req.user.sub, dto);
  }

  @Get('bookings/mine')
  async myBookings(@Req() req: { user: AuthenticatedRequestUser }) {
    return this.escrowService.findMyBookings(req.user.sub);
  }

  @Get('bookings/:id')
  async getBooking(@Req() req: { user: AuthenticatedRequestUser }, @Param('id') bookingId: string) {
    return this.escrowService.findBookingById(req.user.sub, req.user.role, bookingId);
  }

  @Post('bookings/:id/start')
  async startBooking(@Req() req: { user: AuthenticatedRequestUser }, @Param('id') bookingId: string) {
    return this.escrowService.providerStart(req.user.sub, bookingId);
  }

  @Post('bookings/:id/complete')
  async completeBooking(@Req() req: { user: AuthenticatedRequestUser }, @Param('id') bookingId: string) {
    return this.escrowService.providerComplete(req.user.sub, bookingId);
  }

  @Post('bookings/:id/release')
  async releaseEscrow(
    @Req() req: { user: AuthenticatedRequestUser },
    @Param('id') bookingId: string,
    @Body() dto: ReleaseEscrowDto,
  ) {
    return this.escrowService.authorizeRelease(req.user.sub, bookingId, dto.otp);
  }
}
