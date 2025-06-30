import { Test, TestingModule } from '@nestjs/testing';
import { ObjectExpressionHandler } from '../object-expression.handler';
import { ExpressionEvaluatorService } from '../../expression-evaluator.service';

describe('ObjectExpressionHandler', () => {
  let handler: ObjectExpressionHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectExpressionHandler,
        ExpressionEvaluatorService,
      ],
    }).compile();

    handler = module.get<ObjectExpressionHandler>(ObjectExpressionHandler);
  });

  describe('canHandle', () => {
    it('should return true for complete object expressions', () => {
      expect(handler.canHandle('${{user.name}}')).toBe(true);
      expect(handler.canHandle('${{items[0]}}')).toBe(true);
      expect(handler.canHandle('${{{name: "test"}}}')).toBe(true);
      expect(handler.canHandle('${{user?.profile?.name}}')).toBe(true);
    });

    it('should return true for complete expressions with whitespace', () => {
      expect(handler.canHandle(' ${{user.name}} ')).toBe(true);
      expect(handler.canHandle('\n${{user.name}}\t')).toBe(true);
    });

    it('should return true for complex nested expressions', () => {
      expect(handler.canHandle('${{items.map(item => item.id)}}')).toBe(true);
      expect(handler.canHandle('${{user.settings.theme || "default"}}')).toBe(true);
      expect(handler.canHandle('${{JSON.stringify({test: true})}}')).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(handler.canHandle(null)).toBe(false);
      expect(handler.canHandle(undefined)).toBe(false);
      expect(handler.canHandle(123)).toBe(false);
      expect(handler.canHandle({})).toBe(false);
      expect(handler.canHandle([])).toBe(false);
      expect(handler.canHandle(true)).toBe(false);
    });

    it('should return false for template expressions', () => {
      expect(handler.canHandle('Hello ${{user.name}}')).toBe(false);
      expect(handler.canHandle('${{user.name}} World')).toBe(false);
      expect(handler.canHandle('Hello ${{user.name}} World')).toBe(false);
    });

    it('should return false for strings without template expressions', () => {
      expect(handler.canHandle('regular string')).toBe(false);
      expect(handler.canHandle('string with $ but no braces')).toBe(false);
      expect(handler.canHandle('string with { but no $')).toBe(false);
    });

    it('should return false for malformed expressions', () => {
      expect(handler.canHandle('${{')).toBe(false);
      expect(handler.canHandle('${{}}')).toBe(true);
      expect(handler.canHandle('$')).toBe(false);
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
      expect(handler.process('${{string user.name}}', mockVariables)).toBe('John Doe');
      expect(handler.process('${{number user.age}}', mockVariables)).toBe(30);
      expect(handler.process('${{number config.timeout}}', mockVariables)).toBe(5000);
    });

    it('should process nested property access', () => {
      expect(handler.process('${{string user.profile.email}}', mockVariables)).toBe('john@example.com');
      expect(handler.process('${{string user.profile.preferences.theme}}', mockVariables)).toBe('dark');
    });

    it('should process array access', () => {
      expect(handler.process('${{get (first items) "name"}}', mockVariables)).toBe('Item 1');
      expect(handler.process('${{get (nth items 1) "id"}}', mockVariables)).toBe(2);
    });

    it('should process array methods', () => {
      expect(handler.process('${{length items}}', mockVariables)).toBe(2);
      expect(handler.process('${{map items "id"}}', mockVariables)).toEqual([1, 2]);
    });

    it('should process conditional expressions', () => {
      expect(handler.process('${{or user.name "Anonymous"}}', mockVariables)).toBe('John Doe');
      expect(handler.process('${{or user.nickname "Anonymous"}}', mockVariables)).toBe('Anonymous');
    });

    it('should process ternary operators', () => {
      expect(handler.process('${{ternary (gt user.age 18) "adult" "minor"}}', mockVariables)).toBe('adult');
      expect(handler.process('${{ternary (lt user.age 18) "minor" "adult"}}', mockVariables)).toBe('adult');
    });

    it('should handle undefined values correctly', () => {
      expect(handler.process('${{string user.undefinedProperty}}', mockVariables)).toBe('undefined');
      expect(handler.process('${{string nonExistentVariable}}', mockVariables)).toBe('undefined');
    });

    it('should handle null values correctly', () => {
      const variablesWithNull = { ...mockVariables, nullValue: null };
      expect(handler.process('${{string nullValue}}', variablesWithNull)).toBe('null');
    });

    it('should handle boolean values', () => {
      const variablesWithBooleans = { ...mockVariables, isActive: true, isDisabled: false };
      expect(handler.process('${{boolean isActive}}', variablesWithBooleans)).toBe(true);
      expect(handler.process('${{boolean isDisabled}}', variablesWithBooleans)).toBe(false);
    });

    it('should handle string values with special characters', () => {
      const variablesWithSpecialStrings = {
        ...mockVariables,
        specialString: 'String with "quotes" and \'apostrophes\' and \n newlines'
      };
      expect(handler.process('${{string specialString}}', variablesWithSpecialStrings))
        .toBe('String with "quotes" and \'apostrophes\' and \n newlines');
    });

    it('should handle complex JSON operations', () => {
      const complexObject = { deeply: { nested: { value: 'found' } } };
      const variablesWithComplex = { ...mockVariables, complex: complexObject };

      expect(handler.process('${{stringify complex}}', variablesWithComplex))
        .toBe(JSON.stringify(complexObject));

      expect(handler.process('${{string complex.deeply.nested.value}}', variablesWithComplex))
        .toBe('found');
    });

    it('should handle mathematical expressions', () => {
      const mathVariables = { a: 10, b: 5 };

      expect(handler.process('${{multiply a b}}', mathVariables)).toBe(50);
      expect(handler.process('${{add a b}}', mathVariables)).toBe(15);
    });

    it('should handle invalid expressions', () => {
      expect(() => handler.process('${{invalid..syntax}}', mockVariables)).toThrow()
    });

  });

  describe('edge cases', () => {
    it('should handle empty variables object', () => {
      expect(handler.process('${{typeof undefinedVar}}', {})).toBe('undefined');
    });

    it('should handle circular references in variables', () => {
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      // This should not cause infinite recursion since we're not stringifying the circular reference directly
      expect(handler.process('${{string obj.name}}', { obj: circularObj })).toBe('circular');
    });

    it('should handle very long expressions', () => {
      const longExpression = '${{' + 'user.name'.repeat(100) + '}}';
      expect(handler.canHandle(longExpression)).toBe(true);
    });

    it('should handle expressions with various whitespace', () => {
      const variables = { test: 'value' };

      expect(handler.process('${{string test}}', variables)).toBe('value');
    });
  });
});