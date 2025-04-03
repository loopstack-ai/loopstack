import { Injectable } from '@nestjs/common';
const safeEval = require('safe-eval');
import _ from '../utils/safe-lodash';

@Injectable()
export class FunctionCallService {
  isFunction(input: any): boolean {
    if (typeof input !== 'string') {
      return false;
    }
    const trimmed = input.trim();
    return trimmed.startsWith('{') && trimmed.endsWith('}');
  }

  extractGetContents(input: string): string {
    return input.trim().replace(/^{/, '').replace(/}$/, '').trim();
  }

  runEval(value: any, variables: Record<string, any>): any {
    if (!this.isFunction(value)) {
      return value;
    }

    const content = this.extractGetContents(value);

    // const context = variables['context'] ? _.cloneDeep(variables['context']) : {};
    // const args = variables['args'] ? _.cloneDeep(variables['args']) : {};

    // note, this is not safe to use with untrusted user input
    // when running user configs those need to run in a safe environment
    // consider using isolated-vm
    return safeEval(content, { ...variables, _ }) as unknown as any;
  }
}
