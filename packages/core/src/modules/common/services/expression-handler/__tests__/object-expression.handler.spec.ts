import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ObjectExpressionHandler } from '../object-expression.handler';
import { VariableSanitizerService } from '../../variable-sanitizer.service';
import { ObjectExpressionError } from '../../../errors/object-expression.error';

describe('ObjectExpressionHandler', () => {
  let handler: ObjectExpressionHandler;
  let variableSanitizerService: jest.Mocked<VariableSanitizerService>;

  beforeEach(async () => {
    const mockVariableSanitizerService = {
      sanitizeVariables: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectExpressionHandler,
        {
          provide: VariableSanitizerService,
          useValue: mockVariableSanitizerService,
        },
      ],
    }).compile();


    await module.init();

    handler = module.get<ObjectExpressionHandler>(ObjectExpressionHandler);
    variableSanitizerService = module.get(VariableSanitizerService);

    // Setup default mock behavior
    variableSanitizerService.sanitizeVariables.mockImplementation((vars) => vars);
  });

  describe('canHandle', () => {
    it('should return true for valid expression format', () => {
      expect(handler.canHandle('${{ user.name }}')).toBe(true);
      expect(handler.canHandle('${{ path.to.property }}')).toBe(true);
      expect(handler.canHandle('  ${{ user.email }}  ')).toBe(true);
    });

    it('should return false for invalid expression format', () => {
      expect(handler.canHandle('user.name')).toBe(false);
      expect(handler.canHandle('{{ user.name }}')).toBe(false);
      expect(handler.canHandle('${ user.name }')).toBe(false);
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

    it('should call variable sanitizer service', () => {
      handler.process('${{ user.name }}', mockVariables);
      expect(variableSanitizerService.sanitizeVariables).toHaveBeenCalledWith(mockVariables);
    });
  });

  describe('expression validation', () => {
    it('should reject expressions that are too long', () => {
      const longExpression = '${{ ' + 'a'.repeat(1001) + ' }}';

      expect(() => {
        handler.process(longExpression, {});
      }).toThrow(ObjectExpressionError);

      expect(() => {
        handler.process(longExpression, {});
      }).toThrow('Expression too long');
    });

    it('should reject expressions with too many levels', () => {
      const deepExpression = '${{ ' + Array(12).fill('a').join('.') + ' }}';

      expect(() => {
        handler.process(deepExpression, {});
      }).toThrow(ObjectExpressionError);

      expect(() => {
        handler.process(deepExpression, {});
      }).toThrow('Expression depth too high');
    });

    it('should reject empty expressions', () => {
      expect(() => {
        handler.process('${{ }}', {});
      }).toThrow(ObjectExpressionError);

      expect(() => {
        handler.process('${{   }}', {});
      }).toThrow('Empty expression not allowed');
    });

    it('should reject invalid expression format', () => {
      expect(() => {
        handler.process('${{ }', {});
      }).toThrow(ObjectExpressionError);

      expect(() => {
        handler.process('${{ }', {});
      }).toThrow('Invalid expression format');
    });
  });

  describe('security validation', () => {
    const testCases = [
      { expression: '${{ __proto__ }}', description: '__proto__ access' },
      { expression: '${{ user.__proto__ }}', description: 'nested __proto__ access' },
      { expression: '${{ prototype }}', description: 'prototype access' },
      { expression: '${{ constructor }}', description: 'constructor access' },
      { expression: '${{ eval }}', description: 'eval access' },
      { expression: '${{ function }}', description: 'function access' },
      { expression: '${{ require }}', description: 'require access' },
      { expression: '${{ import }}', description: 'import access' },
      { expression: '${{ process }}', description: 'process access' },
      { expression: '${{ process.env }}', description: 'process.env access' },
      { expression: '${{ global }}', description: 'global access' },
      { expression: '${{ window }}', description: 'window access' },
      { expression: '${{ Buffer }}', description: 'Buffer access' },
      { expression: '${{ console }}', description: 'console access' },
      { expression: '${{ __privateProperty }}', description: 'double underscore property' },
    ];

    testCases.forEach(({ expression, description }) => {
      it(`should reject ${description}`, () => {
        expect(() => {
          handler.process(expression, {});
        }).toThrow(ObjectExpressionError);

        expect(() => {
          handler.process(expression, {});
        }).toThrow('Expression contains prohibited patterns');
      });
    });

    it('should reject expressions with invalid characters', () => {
      const invalidExpressions = [
        '${{ user.name$ }}',
        '${{ user@name }}',
        '${{ user.name! }}',
        '${{ user name }}',
        '${{ user.name# }}',
        '${{ user.name% }}',
      ];

      invalidExpressions.forEach((expression) => {
        expect(() => {
          handler.process(expression, {});
        }).toThrow(ObjectExpressionError);

        expect(() => {
          handler.process(expression, {});
        }).toThrow('Expression contains invalid characters or format');
      });
    });
  });

  describe('valid segment patterns', () => {
    const mockVariables = {
      user_name: 'John',
      'user-email': 'john@example.com',
      items: ['a', 'b', 'c'],
      data123: { value: 'test' },
    };

    it('should accept valid segment patterns', () => {
      expect(() => handler.process('${{ user_name }}', mockVariables)).not.toThrow();
      expect(() => handler.process('${{ user-email }}', mockVariables)).not.toThrow();
      expect(() => handler.process('${{ items[0] }}', mockVariables)).not.toThrow();
      expect(() => handler.process('${{ data123.value }}', mockVariables)).not.toThrow();
    });

    it('should handle array indices correctly', () => {
      const result = handler.process('${{ items[2] }}', mockVariables);
      expect(result).toBe('c');
    });
  });

  describe('error handling', () => {
    it('should wrap non-ObjectExpressionError errors', () => {
      // Mock the sanitizer to throw a generic error
      variableSanitizerService.sanitizeVariables.mockImplementation(() => {
        throw new Error('Sanitizer error');
      });

      expect(() => {
        handler.process('${{ user.name }}', {});
      }).toThrow(ObjectExpressionError);
    });

    it('should preserve ObjectExpressionError instances', () => {
      expect(() => {
        handler.process('${{ __proto__ }}', {});
      }).toThrow(ObjectExpressionError);
    });

    it('should log errors appropriately', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      try {
        handler.process('${{ __proto__ }}', {});
      } catch (error) {
        // Expected to throw
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process object expression'),
        expect.objectContaining({
          expression: '${{ __proto__ }}',
        }),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values in variables', () => {
      const variables = {
        nullValue: null,
        undefinedValue: undefined,
        nested: {
          nullValue: null,
        },
      };

      expect(handler.process('${{ nullValue }}', variables)).toBeNull();
      expect(handler.process('${{ undefinedValue }}', variables)).toBeUndefined();
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

    it('should handle numeric property names', () => {
      const variables = {
        123: 'numeric key',
        nested: {
          456: 'nested numeric key',
        },
      };

      expect(handler.process('${{ 123 }}', variables)).toBe('numeric key');
      expect(handler.process('${{ nested.456 }}', variables)).toBe('nested numeric key');
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

    it('should handle multiple segments efficiently', () => {
      const variables = {};
      const segments = Array(10).fill('a');
      const expression = '${{ ' + segments.join('.') + ' }}';

      expect(() => {
        handler.process(expression, variables);
      }).not.toThrow();
    });
  });
});