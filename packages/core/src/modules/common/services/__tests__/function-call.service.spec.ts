import { Test, TestingModule } from '@nestjs/testing';
import { ExpressionEvaluatorService } from '../expression-evaluator.service';

describe('FunctionCallService', () => {
  let service: ExpressionEvaluatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpressionEvaluatorService],
    }).compile();

    service = module.get<ExpressionEvaluatorService>(
      ExpressionEvaluatorService,
    );
  });

  describe('isFunction', () => {
    it('should return true for a valid function string', () => {
      expect(service.isExpression('{ return value }')).toBe(true);
      expect(service.isExpression('{return value}')).toBe(true);
      expect(service.isExpression('  { return value }  ')).toBe(true);
    });

    it('should return false for non-function strings', () => {
      expect(service.isExpression('return value')).toBe(false);
      expect(service.isExpression('{ return value')).toBe(false);
      expect(service.isExpression('return value }')).toBe(false);
      expect(service.isExpression('')).toBe(false);
    });
  });

  describe('extractGetContents', () => {
    it('should extract content from a function string correctly', () => {
      expect(service.extractGetContents('{ return value }')).toBe(
        'return value',
      );
      expect(service.extractGetContents('{return value}')).toBe('return value');
      expect(service.extractGetContents('  { return value }  ')).toBe(
        'return value',
      );
    });

    it('should handle multi-line function content correctly', () => {
      const multiLineFunction = `{
        line one;
        line two;
      }`;
      const expected = `line one;
        line two;`;
      expect(service.extractGetContents(multiLineFunction)).toBe(expected);
    });

    it('should return empty string for empty function', () => {
      expect(service.extractGetContents('{}')).toBe('');
    });
  });

  describe('runEval', () => {
    it('should return the input string if it is not a function', () => {
      const result = service.evaluate('simple string', {});
      expect(result).toBe('simple string');
    });

    it('should evaluate a simple function with context variables', () => {
      const variables = { value: 5 };
      const result = service.evaluate('{ value + 10 }', variables);
      expect(result).toBe(15);
    });

    it('should evaluate a function with object access', () => {
      const variables = {
        context: { value: 5 },
        args: { a: 10, b: 20 },
      };
      const result = service.evaluate(
        '{ context.value + args.a + args.b }',
        variables,
      );
      expect(result).toBe(35);
    });

    it('should provide lodash utilities to the evaluation context', () => {
      const variables = {
        data: { user: { profile: { name: 'John' } } },
      };

      const result = service.evaluate(
        '{ _.get(data, "user.profile.name", "") }',
        variables,
      );
      expect(result).toBe('John');
    });

    it('should handle conditional logic in functions', () => {
      const variables = { a: 5, b: 10 };
      const result = service.evaluate(
        '{ a > b ? "a is greater" : "b is greater" }',
        variables,
      );
      expect(result).toBe('b is greater');
    });

    it('should handle array operations with lodash', () => {
      const variables = {
        items: [1, 2, 3, 4, 5],
      };

      const result = service.evaluate('{ _.sum(items) }', variables);
      expect(result).toBe(15);
    });

    it('should handle multiple statements in the function body', () => {
      const variables = { a: 5, b: 10 };
      const functionBody = `{ 
                a > b 
                ? "a is greater" 
                : "b is greater" 
            }`;

      const result = service.evaluate(functionBody, variables);
      expect(result).toBe('b is greater');
    });

    it('should handle deeply nested object properties', () => {
      const variables = {
        config: {
          features: {
            advanced: {
              enabled: true,
              options: {
                timeout: 1000,
              },
            },
          },
        },
      };

      const result = service.evaluate(
        '{ _.get(config, "features.advanced.options.timeout") }',
        variables,
      );
      expect(result).toBe(1000);
    });

    it('should throw an error for invalid JavaScript in the function body', () => {
      expect(() => {
        service.evaluate('{ invalid javascript code }', {});
      }).toThrow();
    });

    it('should not have access to global objects for security', () => {
      // This test verifies that the safeEval is actually "safe"
      // and doesn't allow access to sensitive globals
      expect(() => {
        service.evaluate('{ process }', {});
      }).toThrow();
    });
  });
});
