import { Controller, Get } from '@nestjs/common';
import { appName } from '@brightloop/shared';

@Controller()
export class AppController {
  @Get()
  getApp(): { name: string } {
    return { name: appName };
  }
}
