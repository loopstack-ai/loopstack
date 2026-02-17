import { Test, TestingModule } from '@nestjs/testing';
import { JexlExpressionError } from '../../../errors/jexl-expression.error';
import { JexlExpressionHandler } from '../jexl-expression.handler';

describe('JexlExpressionHandler', () => {
  let handler: JexlExpressionHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JexlExpressionHandler],
    }).compile();

    await module.init();

    handler = module.get<JexlExpressionHandler>(JexlExpressionHandler);
  });

  describe('canHandle', () => {
    it('should return true for valid JEXL expression format', () => {
      expect(handler.canHandle('${{ user.name }}')).toBe(true);
      expect(handler.canHandle('${{ path.to.property }}')).toBe(true);
      expect(handler.canHandle('  ${{ user.email }}  ')).toBe(true);
      expect(handler.canHandle('${{ a > b ? "yes" : "no" }}')).toBe(true);
      expect(handler.canHandle('${{ items[0] }}')).toBe(true);
    });

    it('should return false for single-brace object expressions', () => {
      expect(handler.canHandle('${ user.name }')).toBe(false);
      expect(handler.canHandle('${ path.to.property }')).toBe(false);
    });

    it('should return false for Handlebars template expressions', () => {
      expect(handler.canHandle('{{ user.name }}')).toBe(false);
      expect(handler.canHandle('Hello {{ user.name }}')).toBe(false);
    });

    it('should return false for invalid expression format', () => {
      expect(handler.canHandle('user.name')).toBe(false);
      expect(handler.canHandle('{ user.name }')).toBe(false);
      expect(handler.canHandle('')).toBe(false);
      expect(handler.canHandle('plain text')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(handler.canHandle(123)).toBe(false);
      expect(handler.canHandle(null)).toBe(false);
      expect(handler.canHandle(undefined)).toBe(false);
      expect(handler.canHandle({})).toBe(false);
      expect(handler.canHandle([])).toBe(false);
    });
  });

  describe('process', () => {
    const mockVariables = {
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        profile: {
          age: 30,
          address: {
            street: '123 Main St',
            city: 'Anytown',
          },
        },
      },
      items: ['item1', 'item2', 'item3'],
      count: 42,
      isActive: true,
    };

    it('should process simple property access', () => {
      const result = handler.process('${{ user.name }}', mockVariables);
      expect(result).toBe('John Doe');
    });

    it('should process nested property access', () => {
      const result = handler.process('${{ user.profile.age }}', mockVariables);
      expect(result).toBe(30);
    });

    it('should process deeply nested property access', () => {
      const result = handler.process('${{ user.profile.address.city }}', mockVariables);
      expect(result).toBe('Anytown');
    });

    it('should process array access by index', () => {
      const result = handler.process('${{ items[0] }}', mockVariables);
      expect(result).toBe('item1');
    });

    it('should process root level properties', () => {
      const result = handler.process('${{ count }}', mockVariables);
      expect(result).toBe(42);
    });

    it('should process boolean values', () => {
      const result = handler.process('${{ isActive }}', mockVariables);
      expect(result).toBe(true);
    });

    it('should return undefined for non-existent properties', () => {
      const result = handler.process('${{ user.nonexistent }}', mockVariables);
      expect(result).toBeUndefined();
    });

    it('should handle expressions with whitespace', () => {
      const result = handler.process('${{   user.name   }}', mockVariables);
      expect(result).toBe('John Doe');
    });
  });

  describe('JEXL-specific features', () => {
    const mockVariables = {
      score: 85,
      name: 'Alice',
      items: [1, 2, 3, 4, 5],
      user: {
        role: 'admin',
        tags: ['vip', 'active'],
      },
      a: 10,
      b: 20,
    };

    it('should evaluate ternary expressions', () => {
      const result = handler.process('${{ score > 80 ? "pass" : "fail" }}', mockVariables);
      expect(result).toBe('pass');
    });

    it('should evaluate comparison operators', () => {
      expect(handler.process('${{ a < b }}', mockVariables)).toBe(true);
      expect(handler.process('${{ a > b }}', mockVariables)).toBe(false);
      expect(handler.process('${{ a == 10 }}', mockVariables)).toBe(true);
      expect(handler.process('${{ a != b }}', mockVariables)).toBe(true);
      expect(handler.process('${{ a >= 10 }}', mockVariables)).toBe(true);
      expect(handler.process('${{ a <= 10 }}', mockVariables)).toBe(true);
    });

    it('should evaluate arithmetic expressions', () => {
      expect(handler.process('${{ a + b }}', mockVariables)).toBe(30);
      expect(handler.process('${{ b - a }}', mockVariables)).toBe(10);
      expect(handler.process('${{ a * b }}', mockVariables)).toBe(200);
      expect(handler.process('${{ b / a }}', mockVariables)).toBe(2);
      expect(handler.process('${{ b % a }}', mockVariables)).toBe(0);
    });

    it('should evaluate logical operators', () => {
      expect(handler.process('${{ a > 5 && b > 15 }}', mockVariables)).toBe(true);
      expect(handler.process('${{ a > 50 || b > 15 }}', mockVariables)).toBe(true);
      expect(handler.process('${{ a > 50 && b > 50 }}', mockVariables)).toBe(false);
    });

    it('should evaluate string concatenation', () => {
      const result = handler.process('${{ "Hello " + name }}', mockVariables);
      expect(result).toBe('Hello Alice');
    });

    it('should evaluate the "in" operator for arrays', () => {
      expect(handler.process('${{ "vip" in user.tags }}', mockVariables)).toBe(true);
      expect(handler.process('${{ "unknown" in user.tags }}', mockVariables)).toBe(false);
    });

    it('should evaluate the "in" operator for substrings', () => {
      expect(handler.process('${{ "Ali" in name }}', mockVariables)).toBe(true);
      expect(handler.process('${{ "Bob" in name }}', mockVariables)).toBe(false);
    });

    it('should evaluate string equality', () => {
      expect(handler.process('${{ name == "Alice" }}', mockVariables)).toBe(true);
      expect(handler.process('${{ name == "Bob" }}', mockVariables)).toBe(false);
      expect(handler.process('${{ user.role == "admin" }}', mockVariables)).toBe(true);
    });

    it('should evaluate object literals', () => {
      const result = handler.process('${{ {key: name, value: score} }}', mockVariables);
      expect(result).toEqual({ key: 'Alice', value: 85 });
    });

    it('should evaluate array literals', () => {
      const result = handler.process('${{ [a, b, a + b] }}', mockVariables);
      expect(result).toEqual([10, 20, 30]);
    });

    it('should evaluate nested ternary expressions', () => {
      const result = handler.process('${{ score > 90 ? "A" : score > 80 ? "B" : "C" }}', mockVariables);
      expect(result).toBe('B');
    });

    it('should evaluate expressions with parentheses', () => {
      const result = handler.process('${{ (a + b) * 2 }}', mockVariables);
      expect(result).toBe(60);
    });
  });

  describe('expression validation', () => {
    it('should reject expressions that are too long', () => {
      const longExpression = '${{ ' + 'a'.repeat(2001) + ' }}';

      expect(() => {
        handler.process(longExpression, {});
      }).toThrow(JexlExpressionError);

      expect(() => {
        handler.process(longExpression, {});
      }).toThrow('Expression too long');
    });

    it('should accept expressions at maximum length', () => {
      const variables: Record<string, unknown> = {};
      // Build a valid expression that is exactly at the limit
      const expr = 'a'.repeat(2000);
      const fullExpression = '${{ ' + expr + ' }}';

      // Should not throw validation error (may throw evaluation error, that's fine)
      expect(() => {
        handler.process(fullExpression, variables);
      }).not.toThrow('Expression too long');
    });

    it('should reject empty expressions', () => {
      expect(() => {
        handler.process('${{  }}', {});
      }).toThrow(JexlExpressionError);

      expect(() => {
        handler.process('${{  }}', {});
      }).toThrow('Invalid expression format');
    });
  });

  describe('security validation', () => {
    it('should reject __proto__ access', () => {
      expect(() => {
        handler.process('${{ __proto__ }}', {});
      }).toThrow(JexlExpressionError);

      expect(() => {
        handler.process('${{ __proto__ }}', {});
      }).toThrow('Expression contains forbidden property access');
    });

    it('should reject nested __proto__ access', () => {
      expect(() => {
        handler.process('${{ user.__proto__ }}', {});
      }).toThrow(JexlExpressionError);
    });

    it('should reject constructor function calls', () => {
      expect(() => {
        handler.process('${{ constructor () }}', {});
      }).toThrow(JexlExpressionError);

      expect(() => {
        handler.process('${{ constructor () }}', {});
      }).toThrow('Expression contains forbidden property access');
    });

    it('should reject prototype property access', () => {
      expect(() => {
        handler.process('${{ prototype.toString }}', {});
      }).toThrow(JexlExpressionError);

      expect(() => {
        handler.process('${{ prototype["toString"] }}', {});
      }).toThrow(JexlExpressionError);
    });

    it('should allow safe property names that contain forbidden substrings', () => {
      const variables = {
        constructorName: 'test',
        prototypeId: 42,
      };

      // "constructorName" does not match /constructor\s*\(/
      expect(() => handler.process('${{ constructorName }}', variables)).not.toThrow();
      // "prototypeId" does not match /prototype\s*\./ or /prototype\s*\[/
      expect(() => handler.process('${{ prototypeId }}', variables)).not.toThrow();
    });
  });

  describe('type preservation', () => {
    it('should preserve string type', () => {
      const result = handler.process('${{ name }}', { name: 'Alice' });
      expect(result).toBe('Alice');
      expect(typeof result).toBe('string');
    });

    it('should preserve number type', () => {
      const result = handler.process('${{ count }}', { count: 42 });
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should preserve boolean type', () => {
      const result = handler.process('${{ flag }}', { flag: true });
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should preserve array type', () => {
      const result = handler.process('${{ items }}', { items: [1, 2, 3] });
      expect(result).toEqual([1, 2, 3]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should preserve object type', () => {
      const obj = { key: 'value', nested: { a: 1 } };
      const result = handler.process('${{ data }}', { data: obj });
      expect(result).toEqual(obj);
      expect(typeof result).toBe('object');
    });

    it('should preserve null', () => {
      const result = handler.process('${{ value }}', { value: null });
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values in variables', () => {
      const variables = {
        nullValue: null,
        nested: {
          nullValue: null,
        },
      };

      expect(handler.process('${{ nullValue }}', variables)).toBeNull();
      expect(handler.process('${{ nested.nullValue }}', variables)).toBeNull();
    });

    it('should handle empty objects and arrays', () => {
      const variables = {
        emptyObject: {},
        emptyArray: [],
      };

      expect(handler.process('${{ emptyObject }}', variables)).toEqual({});
      expect(handler.process('${{ emptyArray }}', variables)).toEqual([]);
    });

    it('should handle complex nested structures', () => {
      const variables = {
        data: {
          users: [
            { name: 'Alice', roles: ['admin', 'user'] },
            { name: 'Bob', roles: ['user'] },
          ],
        },
      };

      expect(handler.process('${{ data.users[0].name }}', variables)).toBe('Alice');
      expect(handler.process('${{ data.users[1].roles[0] }}', variables)).toBe('user');
    });

    it('should handle string literal expressions', () => {
      const result = handler.process('${{ "hello world" }}', {});
      expect(result).toBe('hello world');
    });

    it('should handle numeric literal expressions', () => {
      expect(handler.process('${{ 42 }}', {})).toBe(42);
      expect(handler.process('${{ 3.14 }}', {})).toBe(3.14);
    });

    it('should handle boolean literal expressions', () => {
      expect(handler.process('${{ true }}', {})).toBe(true);
      expect(handler.process('${{ false }}', {})).toBe(false);
    });

    it('should handle multiline expressions', () => {
      const expression = '${{ score > 90\n  ? "A"\n  : "B" }}';
      const result = handler.process(expression, { score: 85 });
      expect(result).toBe('B');
    });
  });

  describe('error handling', () => {
    it('should preserve JexlExpressionError instances', () => {
      expect(() => {
        handler.process('${{ __proto__ }}', {});
      }).toThrow(JexlExpressionError);
    });

    it('should throw EVALUATION_FAILED for invalid JEXL syntax', () => {
      expect(() => {
        handler.process('${{ ??? }}', {});
      }).toThrow(JexlExpressionError);
    });

    it('should include error code on validation errors', () => {
      try {
        handler.process('${{ __proto__ }}', {});
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(JexlExpressionError);
        expect((error as JexlExpressionError).code).toBe('FORBIDDEN_PROPERTY');
      }
    });

    it('should include error code on format errors', () => {
      try {
        handler.process('${{  }}', {});
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(JexlExpressionError);
        expect((error as JexlExpressionError).code).toBe('INVALID_FORMAT');
      }
    });

    it('should include error code on length errors', () => {
      try {
        handler.process('${{ ' + 'a'.repeat(2001) + ' }}', {});
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(JexlExpressionError);
        expect((error as JexlExpressionError).code).toBe('EXPRESSION_TOO_LONG');
      }
    });
  });

  describe('custom helpers', () => {
    it('should call a helper function with no arguments', () => {
      const helpers = [{ name: 'now', fn: () => 1234567890 }];
      const result = handler.process('${{ now() }}', {}, { helpers });
      expect(result).toBe(1234567890);
    });

    it('should call a helper function with arguments', () => {
      const helpers = [{ name: 'add', fn: (a: number, b: number) => a + b }];
      const result = handler.process('${{ add(2, 3) }}', {}, { helpers });
      expect(result).toBe(5);
    });

    it('should call a helper that returns a string', () => {
      const helpers = [{ name: 'greet', fn: (name: string) => `Hello, ${name}!` }];
      const result = handler.process('${{ greet("World") }}', {}, { helpers });
      expect(result).toBe('Hello, World!');
    });

    it('should call a helper that returns a boolean', () => {
      const helpers = [{ name: 'gt', fn: (a: number, b: number) => a > b }];
      const args = { a: 2, b: 1 };
      const result = handler.process('${{ gt(args.a, args.b) }}', { args }, { helpers });
      expect(result).toBe(true);
    });

    it('should call a helper with context data as arguments', () => {
      const helpers = [{ name: 'multiply', fn: (a: number, b: number) => a * b }];
      const result = handler.process('${{ multiply(x, y) }}', { x: 6, y: 7 }, { helpers });
      expect(result).toBe(42);
    });

    it('should support multiple helpers in the same call', () => {
      const helpers = [
        { name: 'double', fn: (n: number) => n * 2 },
        { name: 'increment', fn: (n: number) => n + 1 },
      ];
      const result = handler.process('${{ double(increment(3)) }}', {}, { helpers });
      expect(result).toBe(8);
    });

    it('should use helper result in a larger expression', () => {
      const helpers = [{ name: 'len', fn: (s: string) => s.length }];
      const result = handler.process('${{ len("hello") > 3 }}', {}, { helpers });
      expect(result).toBe(true);
    });

    it('should not leak helpers between process calls', () => {
      const helpers = [{ name: 'secret', fn: () => 42 }];
      handler.process('${{ secret() }}', {}, { helpers });

      expect(() => {
        handler.process('${{ secret() }}', {});
      }).toThrow(JexlExpressionError);
    });

    it('should not leak helpers when process throws', () => {
      const helpers = [{ name: 'myFunc', fn: () => 1 }];

      expect(() => {
        handler.process('${{ myFunc() + ??? }}', {}, { helpers });
      }).toThrow(JexlExpressionError);

      expect(() => {
        handler.process('${{ myFunc() }}', {});
      }).toThrow(JexlExpressionError);
    });

    it('should work without helpers (backwards compatible)', () => {
      const result = handler.process('${{ 1 + 2 }}', {});
      expect(result).toBe(3);
    });

    it('should work with empty helpers array', () => {
      const result = handler.process('${{ 1 + 2 }}', {}, { helpers: [] });
      expect(result).toBe(3);
    });

    it('should call a helper that returns an object', () => {
      const helpers = [{ name: 'makeObj', fn: (k: string, v: string) => ({ [k]: v }) }];
      const result = handler.process('${{ makeObj("key", "value") }}', {}, { helpers });
      expect(result).toEqual({ key: 'value' });
    });

    it('should call a helper that returns an array', () => {
      const helpers = [{ name: 'range', fn: (n: number) => Array.from({ length: n }, (_, i) => i) }];
      const result = handler.process('${{ range(3) }}', {}, { helpers });
      expect(result).toEqual([0, 1, 2]);
    });
  });

  describe('performance considerations', () => {
    it('should handle reasonable expression lengths', () => {
      const variables = { a: { b: { c: { d: { e: 'deep value' } } } } };
      const expression = '${{ a.b.c.d.e }}';

      expect(() => {
        handler.process(expression, variables);
      }).not.toThrow();

      const result = handler.process(expression, variables);
      expect(result).toBe('deep value');
    });

    it('should handle complex but valid expressions', () => {
      const variables = {
        price: 100,
        discount: 0.2,
        tax: 0.08,
      };

      const result = handler.process('${{ (price - price * discount) * (1 + tax) }}', variables);
      expect(result).toBeCloseTo(86.4);
    });
  });
});
