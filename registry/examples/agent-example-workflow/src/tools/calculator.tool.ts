import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';

@Tool({
  uiConfig: {
    description: 'Perform a basic arithmetic calculation. Supports add, subtract, multiply, divide.',
  },
  schema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The arithmetic operation.'),
    a: z.number().describe('First operand.'),
    b: z.number().describe('Second operand.'),
  }),
})
export class CalculatorTool extends BaseTool {
  call(args: { operation: string; a: number; b: number }): Promise<ToolResult> {
    let result: number;

    switch (args.operation) {
      case 'add':
        result = args.a + args.b;
        break;
      case 'subtract':
        result = args.a - args.b;
        break;
      case 'multiply':
        result = args.a * args.b;
        break;
      case 'divide':
        if (args.b === 0) {
          return Promise.resolve({ data: 'Error: Division by zero', error: 'Cannot divide by zero' });
        }
        result = args.a / args.b;
        break;
      default:
        return Promise.resolve({ data: `Unknown operation: ${args.operation}`, error: 'Unsupported operation' });
    }

    return Promise.resolve({
      data: `${args.a} ${args.operation} ${args.b} = ${result}`,
    });
  }
}
