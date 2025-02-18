import { Controller, Get } from '@nestjs/common';
import { LoopstackCoreService } from './loopstack-core.service';

@Controller('core')
export class LoopstackCoreController {
  constructor(private readonly appService: LoopstackCoreService) {}

  @Get('hello')
  getHello(): string {
    return this.appService.getHello();
  }
}
