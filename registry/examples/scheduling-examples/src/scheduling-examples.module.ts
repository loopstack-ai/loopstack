import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';

@StudioApp({
  title: 'Scheduling Examples',
  workflows: [],
})
@Module({})
export class SchedulingExamplesModule {}
