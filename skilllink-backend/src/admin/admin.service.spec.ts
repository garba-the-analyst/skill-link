import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {
            user: { findMany: jest.fn(), count: jest.fn() },
            serviceListing: { count: jest.fn() },
            booking: { findMany: jest.fn(), count: jest.fn() },
            volunteerHourLog: { count: jest.fn() },
            volunteerOpportunity: { count: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
