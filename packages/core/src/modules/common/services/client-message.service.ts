import { Injectable } from '@nestjs/common';
import { ClientMessageDto } from '@loopstack/shared';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ClientMessageService {
  constructor(private eventEmitter: EventEmitter2) {}

  dispatch(message: ClientMessageDto) {
    this.eventEmitter.emit('client.message', message);
  }
}