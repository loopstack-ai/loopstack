import { Injectable } from '@nestjs/common';
import { TemplateEngineService } from './template-engine.service';
import { FunctionCallService } from './function-call.service';

@Injectable()
export class ValueParserService {
  constructor(
    private templateEngineService: TemplateEngineService,
    private functionCallService: FunctionCallService,
  ) {}

  parseValue(value: string | string[], variables: Record<string, any>): string | string[] | object | object[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.parseValue(item, variables) as string);
    }

    if (this.templateEngineService.isTemplate(value)) {
      return this.templateEngineService.parseValue(value, variables);
    }

    if (this.functionCallService.isFunction(value)) {
      return this.functionCallService.runEval(value, variables);
    }

    return value;
  }

  parseObjectValues(
    obj: Record<string, any>,
    variables: Record<string, any>,
  ): any {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        this.parseValue(value, variables),
      ]),
    );
  }
}
