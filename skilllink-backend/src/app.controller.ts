import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Doubles as Render's health check target for this web service.
  @Get()
  getStatus() {
    return this.appService.getStatus();
  }
}
