import { ConfigElement } from '@loopstack/shared';

export class ConfigTraceError extends Error {
  public readonly name = 'ConfigTraceError';
  public readonly originalError: Error;
  public readonly configTrace: string[];

  constructor(
    originalError: Error,
    configElement: ConfigElement<any>,
  ) {
    super(originalError.message);

    if (originalError instanceof ConfigTraceError) {
      this.configTrace = [...originalError.configTrace];
      this.originalError = originalError.originalError;
    } else {
      this.configTrace = [];
      this.originalError = originalError;
    }

    this.configTrace.push(`    at ${configElement.type}.${configElement.name} (${configElement.fullPath}:${configElement.location.start.line}:${configElement.location.start.col})`);

    this.stack = this.formatCombinedStack();

    if ('cause' in originalError) {
      this.cause = originalError.cause;
    }
  }

  private formatCombinedStack(): string {
    const originalStack = this.originalError?.stack || 'No stack trace available';

    return [
      `${this.name}: ${this.message}`,
      'Config Trace:',
      ...this.configTrace,
      '',
      'Original Error:',
      originalStack,
    ].join('\n');
  }


}