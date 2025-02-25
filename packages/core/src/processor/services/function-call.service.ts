import { Injectable } from '@nestjs/common';
import _ from 'lodash';

@Injectable()
export class FunctionCallService {
  isFunction(input: string): boolean {
    const trimmed = input.trim();
    return trimmed.startsWith('{') && trimmed.endsWith('}');
  }

  extractGetContents(input: string): string {
    return input.replace(/^{/, '').replace(/}$/, '');
  }

  parseValue(value: string, variables: Record<string, any>) {
    const trimmed = value.trim();
    if (!this.isFunction(trimmed)) {
      return trimmed;
    }

    const contents = this.extractGetContents(trimmed);

    const context = variables['context'] ?? {};
    const args = variables['args'] ?? {};
    const func = new Function('context', 'args', '_', `return ${contents};`);

    return func(context, args, _);
  }
}
