import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

// PrismaService comes from the global PrismaModule — no need to list it here.
@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
