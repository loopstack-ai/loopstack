import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';

@StudioApp({
  title: 'Testing Examples',
  workflows: [],
})
@Module({})
export class TestingExamplesModule {}
