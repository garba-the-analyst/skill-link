// skilllink-backend/src/volunteer/volunteer.module.ts
import { Module } from '@nestjs/common';
import { VolunteerController } from './volunteer.controller';
import { VolunteerService } from './volunteer.service';

// PrismaService comes from the global PrismaModule — no need to list it here.
@Module({
  controllers: [VolunteerController],
  providers: [VolunteerService],
})
export class VolunteerModule {}
