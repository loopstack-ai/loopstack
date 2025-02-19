import { Injectable } from '@nestjs/common';

@Injectable()
export class LoopstackCoreService {
  getHello(): string {
    return 'Hello World';
  }
}
