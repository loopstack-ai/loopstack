import { Test, TestingModule } from '@nestjs/testing';
import { ObjectExpressionHandler } from '../object-expression.handler';
import { StringParser } from '../../string-parser.service';

describe('ObjectExpressionHandler', () => {
  let handler: ObjectExpressionHandler;
  let stringParser: StringParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectExpressionHandler,
        StringParser,
      ],
    }).compile();

    handler = module.get<ObjectExpressionHandler>(ObjectExpressionHandler);
    stringParser = module.get<StringParser>(StringParser);
  });

  describe('canHandle', () => {
    it('should return true for complete object expressions', () => {
      expect(handler.canHandle('${user.name}')).toBe(true);
      expect(handler.canHandle('${items[0]}')).toBe(true);
      expect(handler.canHandle('${{name: "test"}}')).toBe(true);
      expect(handler.canHandle('${user?.profile?.name}')).toBe(true);
    });

    it('should return true for complete expressions with whitespace', () => {
      expect(handler.canHandle(' ${user.name} ')).toBe(true);
      expect(handler.canHandle('\n${user.name}\t')).toBe(true);
    });

    it('should return true for complex nested expressions', () => {
      expect(handler.canHandle('${items.map(item => item.id)}')).toBe(true);
      expect(handler.canHandle('${user.settings.theme || "default"}')).toBe(true);
      expect(handler.canHandle('${JSON.stringify({test: true})}')).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(handler.canHandle(null)).toBe(false);
      expect(handler.canHandle(undefined)).toBe(false);
      expect(handler.canHandle(123)).toBe(false);
      expect(handler.canHandle({})).toBe(false);
      expect(handler.canHandle([])).toBe(false);
      expect(handler.canHandle(true)).toBe(false);
    });

    it('should return false for incomplete expressions', () => {
      expect(handler.canHandle('Hello ${user.name}')).toBe(false);
      expect(handler.canHandle('${user.name} World')).toBe(false);
      expect(handler.canHandle('Hello ${user.name} World')).toBe(false);
    });

    it('should return false for strings without template expressions', () => {
      expect(handler.canHandle('regular string')).toBe(false);
      expect(handler.canHandle('string with $ but no braces')).toBe(false);
      expect(handler.canHandle('string with { but no $')).toBe(false);
    });

    it('should return false for malformed expressions', () => {
      expect(handler.canHandle('${')).toBe(false);
      expect(handler.canHandle('${}')).toBe(false);
      expect(handler.canHandle('$')).toBe(false);
    });

    it('should delegate to StringParser.isCompleteExpression', () => {
      const spy = jest.spyOn(stringParser, 'isCompleteExpression');

      handler.canHandle('${test}');

      expect(spy).toHaveBeenCalledWith('${test}');
    });
  });

  describe('process', () => {
    const mockVariables = {
      user: {
        name: 'John Doe',
        age: 30,
        profile: {
          email: 'john@example.com',
          preferences: {
            theme: 'dark'
          }
        }
      },
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ],
      config: {
        apiUrl: 'https://api.example.com',
        timeout: 5000
      }
    };

    it('should process simple property access', () => {
      expect(handler.process('${user.name}', mockVariables)).toBe('John Doe');
      expect(handler.process('${user.age}', mockVariables)).toBe(30);
      expect(handler.process('${config.timeout}', mockVariables)).toBe(5000);
    });

    it('should process nested property access', () => {
      expect(handler.process('${user.profile.email}', mockVariables)).toBe('john@example.com');
      expect(handler.process('${user.profile.preferences.theme}', mockVariables)).toBe('dark');
    });

    it('should process array access', () => {
      expect(handler.process('${items[0].name}', mockVariables)).toBe('Item 1');
      expect(handler.process('${items[1].id}', mockVariables)).toBe(2);
    });

    it('should process array methods', () => {
      expect(handler.process('${items.length}', mockVariables)).toBe(2);
      expect(handler.process('${items.map(item => item.id)}', mockVariables)).toEqual([1, 2]);
    });

    it('should process object literals', () => {
      const result = handler.process('${{name: user.name, age: user.age}}', mockVariables);
      expect(result).toEqual({ name: 'John Doe', age: 30 });
    });

    it('should process conditional expressions', () => {
      expect(handler.process('${user.name || "Anonymous"}', mockVariables)).toBe('John Doe');
      expect(handler.process('${user.nickname || "Anonymous"}', mockVariables)).toBe('Anonymous');
    });

    it('should process ternary operators', () => {
      expect(handler.process('${user.age > 18 ? "adult" : "minor"}', mockVariables)).toBe('adult');
      expect(handler.process('${user.age < 18 ? "minor" : "adult"}', mockVariables)).toBe('adult');
    });

    it('should handle undefined values correctly', () => {
      expect(handler.process('${user.undefinedProperty}', mockVariables)).toBeUndefined();
      expect(() => { handler.process('${nonExistentVariable}', mockVariables) }).toThrow();
    });

    it('should handle null values correctly', () => {
      const variablesWithNull = { ...mockVariables, nullValue: null };
      expect(handler.process('${nullValue}', variablesWithNull)).toBeNull();
    });

    it('should handle boolean values', () => {
      const variablesWithBooleans = { ...mockVariables, isActive: true, isDisabled: false };
      expect(handler.process('${isActive}', variablesWithBooleans)).toBe(true);
      expect(handler.process('${isDisabled}', variablesWithBooleans)).toBe(false);
    });

    it('should handle string values with special characters', () => {
      const variablesWithSpecialStrings = {
        ...mockVariables,
        specialString: 'String with "quotes" and \'apostrophes\' and \n newlines'
      };
      expect(handler.process('${specialString}', variablesWithSpecialStrings))
        .toBe('String with "quotes" and \'apostrophes\' and \n newlines');
    });

    it('should handle complex JSON operations', () => {
      const complexObject = { deeply: { nested: { value: 'found' } } };
      const variablesWithComplex = { ...mockVariables, complex: complexObject };

      expect(handler.process('${JSON.stringify(complex)}', variablesWithComplex))
        .toBe(JSON.stringify(complexObject));
      expect(handler.process('${complex.deeply.nested.value}', variablesWithComplex))
        .toBe('found');
    });

    it('should handle mathematical expressions', () => {
      const mathVariables = { a: 10, b: 5, numbers: [1, 2, 3, 4, 5] };

      expect(handler.process('${a + b}', mathVariables)).toBe(15);
      expect(handler.process('${a * b}', mathVariables)).toBe(50);
      expect(handler.process('${numbers.reduce((sum, n) => sum + n, 0)}', mathVariables)).toBe(15);
    });

    it('should delegate to StringParser.extractExpressionContent', () => {
      const spy = jest.spyOn(stringParser, 'extractExpressionContent');

      handler.process('${user.name}', mockVariables);

      expect(spy).toHaveBeenCalledWith('${user.name}');
    });

    it('should throw error for malformed expressions', () => {
      jest.spyOn(stringParser, 'extractExpressionContent').mockImplementation(() => {
        throw new Error('Template expression is missing closing brace');
      });

      expect(() => {
        handler.process('${user.name', mockVariables);
      }).toThrow('Template expression is missing closing brace');
    });

    it('should throw error for invalid JavaScript expressions', () => {
      expect(() => {
        handler.process('${invalid..syntax}', mockVariables);
      }).toThrow();
    });

    it('should handle expressions with string literals containing braces', () => {
      const result = handler.process('${"Hello {world}"}', mockVariables);
      expect(result).toBe('Hello {world}');
    });

    it('should handle expressions with template literals', () => {
      const result = handler.process('${`Hello ${user.name}!`}', mockVariables);
      expect(result).toBe('Hello John Doe!');
    });
  });

  describe('integration with StringParser', () => {
    it('should work correctly when StringParser throws errors', () => {
      jest.spyOn(stringParser, 'isCompleteExpression').mockImplementation(() => {
        throw new Error('StringParser error');
      });

      expect(() => {
        handler.canHandle('${test}');
      }).toThrow('StringParser error');
    });

    it('should work correctly when StringParser returns expected values', () => {
      jest.spyOn(stringParser, 'isCompleteExpression').mockReturnValue(true);
      jest.spyOn(stringParser, 'extractExpressionContent').mockReturnValue('user.name');

      expect(handler.canHandle('${user.name}')).toBe(true);

      const result = handler.process('${user.name}', { user: { name: 'Test' } });
      expect(result).toBe('Test');
    });
  });

  describe('edge cases', () => {
    it('should handle empty variables object', () => {
      expect(handler.process('${typeof undefinedVar}', {})).toBe('undefined');
    });

    it('should handle circular references in variables', () => {
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      // This should not cause infinite recursion since we're not stringifying the circular reference directly
      expect(handler.process('${obj.name}', { obj: circularObj })).toBe('circular');
    });

    it('should handle very long expressions', () => {
      const longExpression = '${' + 'user.name'.repeat(100) + '}';

      jest.spyOn(stringParser, 'isCompleteExpression').mockReturnValue(true);
      jest.spyOn(stringParser, 'extractExpressionContent').mockReturnValue('user.name');

      expect(handler.canHandle(longExpression)).toBe(true);
    });

    it('should handle expressions with various whitespace', () => {
      const variables = { test: 'value' };

      jest.spyOn(stringParser, 'extractExpressionContent').mockReturnValue('test');

      expect(handler.process('${ test }', variables)).toBe('value');
    });
  });
});