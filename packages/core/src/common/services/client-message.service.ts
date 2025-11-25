import { Injectable } from '@nestjs/common';
import { ClientMessageInterface } from '@loopstack/contracts/types';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ClientMessageService {
  constructor(private eventEmitter: EventEmitter2) {}

  dispatch(message: ClientMessageInterface) {
    this.eventEmitter.emit('client.message', message);
  }
}
