import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClientMessageService } from './services/client-message.service';

@Module({
  imports: [ConfigModule, EventEmitterModule.forRoot()],
  providers: [ClientMessageService],
  exports: [ClientMessageService],
})
export class CommonModule {}
