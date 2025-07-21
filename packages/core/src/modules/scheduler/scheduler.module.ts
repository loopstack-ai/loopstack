import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration';
import { PersistenceModule } from '../persistence';
import { DiscoveryModule } from '@nestjs/core';
import { CommonModule } from '../common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduledTask } from './entities/scheduled-task.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskSchedulerService } from './services/task-scheduler.service';
import { TaskExecutionListener } from './services/task-execution.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledTask]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    DiscoveryModule,
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
  ],
  providers: [TaskSchedulerService, TaskExecutionListener],
  exports: [TaskSchedulerService],
})
export class SchedulerModule {}
