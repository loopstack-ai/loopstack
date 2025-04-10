import { Injectable } from '@nestjs/common';
import { FunctionCallService } from './function-call.service';

@Injectable()
export class ConfigValueParserService {
  constructor(
    private functionCallService: FunctionCallService,
  ) {}

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

  evalObjectLeafs<T>(obj: any, variables: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return this.functionCallService.runEval(obj, variables) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.evalObjectLeafs(item, variables),
      ) as unknown as T;
    }

    const result = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.evalObjectLeafs(obj[key], variables);
      }
    }

    return result;
  }
}
