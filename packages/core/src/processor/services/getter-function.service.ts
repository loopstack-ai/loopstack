import { Injectable } from '@nestjs/common';

@Injectable()
export class GetterFunctionService {
  isGetter(input: string): boolean {
    return /^get\([^)]+\)$/.test(input);
  }

  extractGetContents(input: string): string {
    const regex = /^get\(([^)]+)\)$/;
    const match = input.match(regex);

    return match ? match[1] : input;
  }

  parseValue(value: string, variables: Record<string, any>) {
    if (!this.isGetter(value)) {
      return value;
    }

    const contents = this.extractGetContents(value);

    const context = variables['context'] ?? {};
    const args = variables['args'] ?? {};
    const func = new Function('context', 'args', `return ${contents};`);

    return func(context, args);
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
