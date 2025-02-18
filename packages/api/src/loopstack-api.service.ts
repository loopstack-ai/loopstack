import { Injectable } from '@nestjs/common';

@Injectable()
export class LoopstackApiService {
  getHello(): string {
    return 'Hello World!';
  }
}
