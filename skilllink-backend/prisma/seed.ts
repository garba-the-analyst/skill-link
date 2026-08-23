// skilllink-backend/prisma/seed.ts
//
// Thin CLI wrapper — the actual seeding logic lives in
// src/seed/seed-runner.ts so it can be shared with the HTTP-triggered
// version of this (ops/ops.controller.ts), for environments where you
// can't reach the database or a shell directly (e.g. Render's free tier).
//
// Run with: npm run db:seed
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { runSeed } from '../src/seed/seed-runner';

const prisma = new PrismaClient();

runSeed(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
