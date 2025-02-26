import { Injectable } from '@nestjs/common';
const safeEval = require('safe-eval')
import _ from '../utils/safe-lodash';

@Injectable()
export class FunctionCallService {
  isFunction(input: string): boolean {
    const trimmed = input.trim();
    return trimmed.startsWith('{') && trimmed.endsWith('}');
  }

  extractGetContents(input: string): string {
    return input
        .replace(/^{/, '')
        .replace(/}$/, '')
        .trim();
  }

  parseValue(value: string, variables: Record<string, any>) {
    const trimmed = value.trim();
    if (!this.isFunction(trimmed)) {
      return trimmed;
    }

    const contents = this.extractGetContents(trimmed);

    const context = variables['context'] ? _.cloneDeep(variables['context']) : {};
    const args = variables['args'] ? _.cloneDeep(variables['args']) : {};

    // note, this is not safe to use with untrusted user input
    // when running user configs those need to run in a safe environment
    // consider using isolated-vm
    return safeEval(contents, { context, args, _ });
  }
}
