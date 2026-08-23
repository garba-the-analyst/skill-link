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
}
