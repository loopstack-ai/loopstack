import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';

@StudioApp({
  title: 'Integration Examples',
  workflows: [],
})
@Module({})
export class IntegrationExamplesModule {}
