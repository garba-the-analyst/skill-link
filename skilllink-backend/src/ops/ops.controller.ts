// skilllink-backend/src/ops/ops.controller.ts
//
// A narrow escape hatch for hosts like Render's free tier, where there's no
// Shell, no One-Off Jobs, and no external database connection — the only
// thing reachable from outside is the app's own HTTPS endpoints. This lets
// you trigger the exact same seeding logic as `npm run db:seed` by calling
// the already-running app instead.
//
// Protected by a shared secret (SEED_TRIGGER_SECRET), NOT a user login —
// there may be zero users in the database when you need to call this.
// If SEED_TRIGGER_SECRET isn't set, this endpoint refuses every request.
import { Controller, Post, Headers, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { runSeed } from '../seed/seed-runner';

@Controller('ops')
export class OpsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('seed')
  async triggerSeed(@Headers('x-seed-secret') providedSecret?: string) {
    const expectedSecret = process.env.SEED_TRIGGER_SECRET;

    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new ForbiddenException(
        'Missing or incorrect x-seed-secret header. Set SEED_TRIGGER_SECRET in this service\'s environment variables to enable this endpoint.',
      );
    }

    const summary = await runSeed(this.prisma);
    return { message: 'Seed completed.', summary };
  }

  // Quick promotion without wiping — useful if the DB is already seeded and you just need to give an existing user admin access.
  // Body: { email?: string } — defaults to malik@newgate.test
  @Post('promote')
  async promoteToAdmin(
    @Headers('x-seed-secret') providedSecret?: string,
    @Headers('x-target-email') targetEmailHeader?: string,
  ) {
    const expectedSecret = process.env.SEED_TRIGGER_SECRET;
    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new ForbiddenException(
        'Missing or incorrect x-seed-secret header. Set SEED_TRIGGER_SECRET in this service\'s environment variables to enable this endpoint.',
      );
    }
    // Allow override via header for flexibility, default to malik
    const email = (targetEmailHeader || 'malik@newgate.test').trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException(`User with email ${email} not found.`);
    const promoted = await this.prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN', identityStatus: 'VERIFIED', professionalStatus: 'VERIFIED' },
    });
    return { message: `Promoted ${email} to SUPER_ADMIN`, user: { id: promoted.id, email: promoted.email, role: promoted.role } };
  }
}
