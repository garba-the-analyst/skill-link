import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'skilllink-backend',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
