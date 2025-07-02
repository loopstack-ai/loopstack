export class ObjectExpressionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ObjectExpressionError';
  }
}