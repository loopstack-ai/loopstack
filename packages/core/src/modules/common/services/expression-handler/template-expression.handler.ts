import { Injectable } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { SecureHandlebarsProcessor } from '../secure-handlebars-processor.service';

@Injectable()
export class TemplateExpressionHandler implements TemplateDetector, TemplateProcessor {

  constructor(
    private secureTemplateProcessor: SecureHandlebarsProcessor,
  ) {}

  canHandle(value: string): boolean {
    return value.includes('{{')
      && value.includes('}}')
      && !value.trim().startsWith('${{');
  }

  process(value: string, path: string, variables: Record<string, any>): string {
    return this.secureTemplateProcessor.render(value, variables);
  }
}