import { Injectable } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { SecureHandlebarsProcessor } from '../secure-handlebars-processor.service';

@Injectable()
export class ObjectExpressionHandler implements TemplateDetector, TemplateProcessor {

  constructor(
    private secureHandlebarsProcessor: SecureHandlebarsProcessor,
  ) {}

  canHandle(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.startsWith('${{')
      && trimmed.endsWith('}}');
  }

  process(value: string, path: string, variables: Record<string, any>, secure: boolean): any {
    return this.secureHandlebarsProcessor.parse(value.trim(), path, variables, secure)
  }
}