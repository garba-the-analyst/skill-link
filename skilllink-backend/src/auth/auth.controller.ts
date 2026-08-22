// skilllink-backend/src/auth/auth.controller.ts
import { Controller, Post, Put, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfileToggleDto } from './dto/profile-toggle.dto';
import { JwtAuthGuard, AuthenticatedRequestUser } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile/toggles')
  async updateProfileToggles(
    @Req() request: { user: AuthenticatedRequestUser },
    @Body() dto: ProfileToggleDto,
  ) {
    return this.authService.updateToggles(request.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() request: { user: AuthenticatedRequestUser }) {
    return this.authService.validateUserById(request.user.sub);
  }
}
