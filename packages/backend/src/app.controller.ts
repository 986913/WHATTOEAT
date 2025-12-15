import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /* 
    URL: http://localhost:3001/api/v1/hitest
   */
  @Get('hitest')
  getHello(): any {
    return this.appService.getHello();
  }
}
