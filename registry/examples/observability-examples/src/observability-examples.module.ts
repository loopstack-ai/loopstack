import { Module, OnModuleInit } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { QuotaCalculatorRegistry, QuotaModule } from '@loopstack/quota';
import { AuditLogExampleWorkflow } from './workflows/audit-log/audit-log-example.workflow';
import { AuditListener } from './workflows/audit-log/listeners/audit.listener';
import { AuditLogService } from './workflows/audit-log/services/audit-log.service';
import { WordsProcessedQuotaCalculator } from './workflows/custom-calculator/calculators/words-processed.calculator';
import { CustomCalculatorExampleWorkflow } from './workflows/custom-calculator/custom-calculator-example.workflow';
import { AnalyzeTextTool } from './workflows/custom-calculator/tools/analyze-text.tool';
import { QuotaExampleWorkflow } from './workflows/quota/quota-example.workflow';
import { TracingInterceptor } from './workflows/tracing/interceptors/tracing.interceptor';
import { ToolTraceService } from './workflows/tracing/services/tool-trace.service';
import { SimulateWorkTool } from './workflows/tracing/tools/simulate-work.tool';
import { TracingExampleWorkflow } from './workflows/tracing/tracing-example.workflow';

@StudioApp({
  title: 'Observability Examples',
  workflows: [QuotaExampleWorkflow, TracingExampleWorkflow, CustomCalculatorExampleWorkflow, AuditLogExampleWorkflow],
})
@Module({
  imports: [QuotaModule.forRoot({ enabled: false })],
  providers: [
    QuotaExampleWorkflow,
    TracingExampleWorkflow,
    ToolTraceService,
    TracingInterceptor,
    SimulateWorkTool,
    CustomCalculatorExampleWorkflow,
    AnalyzeTextTool,
    AuditLogExampleWorkflow,
    AuditLogService,
    AuditListener,
  ],
  exports: [QuotaExampleWorkflow, TracingExampleWorkflow, CustomCalculatorExampleWorkflow, AuditLogExampleWorkflow],
})
export class ObservabilityExamplesModule implements OnModuleInit {
  constructor(private readonly calculatorRegistry: QuotaCalculatorRegistry) {}

  onModuleInit() {
    this.calculatorRegistry.register('AnalyzeTextTool', new WordsProcessedQuotaCalculator());
  }
}
