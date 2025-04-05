import { Injectable } from '@nestjs/common';
import { FunctionCallService } from '../index';

@Injectable()
export class ConfigValueParserService {
  constructor(private functionCallService: FunctionCallService) {}

  parseValue(
    value: string | string[],
    variables: Record<string, any>,
  ): any | any[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.parseValue(item, variables));
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
