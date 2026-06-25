import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { QuotaModule } from '@loopstack/quota';
import { QuotaExampleWorkflow } from './workflows/quota/quota-example.workflow';

@StudioApp({
  title: 'Observability Examples',
  workflows: [QuotaExampleWorkflow],
})
@Module({
  imports: [QuotaModule.forRoot({ enabled: false })],
  providers: [QuotaExampleWorkflow],
  exports: [QuotaExampleWorkflow],
})
export class ObservabilityExamplesModule {}
