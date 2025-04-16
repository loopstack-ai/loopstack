import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { delay, distinctUntilChanged, Subject } from 'rxjs';
import { isEqual } from 'lodash';
import { OnEvent } from '@nestjs/event-emitter';
import { ClientMessageDto } from '@loopstack/shared';

@Injectable()
export class WsEventEmitterService {
  private debounceTime = 300; // message debounce time in ms
  private eventSubjectRegistry: Record<string, Subject<any>> = {};

  constructor(@Inject('REDIS_PUB_SUB') private client: ClientProxy) {}

  createSubscription(): Subject<any> {
    const subject = new Subject<any>();
    subject
      .pipe(distinctUntilChanged(isEqual), delay(this.debounceTime + 1))
      .subscribe((message) => {
        this.client.emit('ws.message', message);
      });

    return subject;
  }

  getSubject(type: string): Subject<any> {
    if (!this.eventSubjectRegistry[type]) {
      this.eventSubjectRegistry[type] = this.createSubscription();
    }

    return this.eventSubjectRegistry[type];
  }

  @OnEvent('client.message')
  handleClientMessage(payload: ClientMessageDto) {
    const subject = this.getSubject(payload.type);
    subject.next({
      id: Math.floor(new Date().getTime() / this.debounceTime),
      type: payload.type,
      message: payload,
    });
  }
}
