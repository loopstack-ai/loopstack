import { Controller, Get } from '@nestjs/common';
import { LoopstackApiService } from './loopstack-api.service';

@Controller('api')
export class LoopstackApiController {
  constructor(private readonly appService: LoopstackApiService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
