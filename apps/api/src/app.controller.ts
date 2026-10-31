import { Controller, Get } from '@nestjs/common';
import { appName } from '@brightloop/shared';
import { Public } from './common/auth/public.decorator.js';

@Controller()
export class AppController {
  @Public()
  @Get()
  getApp(): { name: string } {
    return { name: appName };
  }
}
