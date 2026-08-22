// skilllink-backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ProfileToggleDto } from './dto/profile-toggle.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Fields safe to send back to the client. Never spread the raw Prisma user —
// that would leak passwordHash to the frontend.
function toPublicUser(user: {
  id: string;
  email: string;
  displayName: string;
  profileType: string;
  role: string;
  isPaidProvider: boolean;
  isVolunteer: boolean;
  identityStatus: string;
  professionalStatus: string;
  totalLoggedHours: number;
  accumulatedPoints: number;
  availableCents: number;
  totalEarnedCents: number;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    profileType: user.profileType,
    role: user.role,
    isPaidProvider: user.isPaidProvider,
    isVolunteer: user.isVolunteer,
    identityStatus: user.identityStatus,
    professionalStatus: user.professionalStatus,
    totalLoggedHours: user.totalLoggedHours,
    accumulatedPoints: user.accumulatedPoints,
    availableCents: user.availableCents,
    totalEarnedCents: user.totalEarnedCents,
  };
}

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'fallbackDevSecretKey';

  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists.');
    }

    // High-entropy hashing with 12 salt rounds protects against brute-force attacks
    const hashedPass = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: hashedPass,
        displayName: dto.displayName,
        profileType: dto.profileType || 'INDIVIDUAL',
        isPaidProvider: dto.isPaidProvider || false,
        isVolunteer: dto.isVolunteer || false,
      },
    });

    const accessToken = this.generateToken(user.id, user.email, user.role);

    return { accessToken, user: toPublicUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    const accessToken = this.generateToken(user.id, user.email, user.role);

    return { accessToken, user: toPublicUser(user) };
  }

  async updateToggles(userId: string, dto: ProfileToggleDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isPaidProvider: dto.isPaidProvider,
        isVolunteer: dto.isVolunteer,
      },
    });

    return toPublicUser(updatedUser);
  }

  async validateUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Session expired or user not found.');
    }

    return toPublicUser(user);
  }

  private generateToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      { sub: userId, email, role },
      this.jwtSecret,
      { expiresIn: '7d' }, // Session active for 7 days
    );
  }
}
