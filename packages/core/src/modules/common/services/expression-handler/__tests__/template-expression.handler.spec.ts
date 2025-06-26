import { Test, TestingModule } from '@nestjs/testing';
import { TemplateExpressionHandler } from '../template-expression.handler';
import { StringParser } from '../../string-parser.service';

describe('TemplateExpressionHandler', () => {
  let handler: TemplateExpressionHandler;
  let stringParser: StringParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateExpressionHandler,
        StringParser,
      ],
    }).compile();

    handler = module.get<TemplateExpressionHandler>(TemplateExpressionHandler);
    stringParser = module.get<StringParser>(StringParser);
  });

  describe('canHandle', () => {
    it('should return true for mixed content with template expressions', () => {
      expect(handler.canHandle('Hello ${user.name}!')).toBe(true);
      expect(handler.canHandle('${user.name} is ${user.age} years old')).toBe(true);
      expect(handler.canHandle('Welcome ${user.name}, you have ${notifications.length} notifications')).toBe(true);
      expect(handler.canHandle('${greeting} ${user.name}!')).toBe(true);
    });

    it('should return true for strings with multiple template expressions', () => {
      expect(handler.canHandle('${first} and ${second} and ${third}')).toBe(true);
      expect(handler.canHandle('User: ${user.name}, Email: ${user.email}, Age: ${user.age}')).toBe(true);
      expect(handler.canHandle('API: ${config.baseUrl}/users/${userId}')).toBe(true);
    });

    it('should return true for template expressions with leading/trailing text', () => {
      expect(handler.canHandle('Prefix ${variable} suffix')).toBe(true);
      expect(handler.canHandle('${variable} only has suffix')).toBe(true);
      expect(handler.canHandle('only has prefix ${variable}')).toBe(true);
    });

    it('should return false for template expressions which are pure expressions', () => {
      expect(handler.canHandle('   ${variable}   ')).toBe(false);
      expect(handler.canHandle('${variable}   ')).toBe(false);
      expect(handler.canHandle(`
        \${variable}
        
      `)).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(handler.canHandle(null)).toBe(false);
      expect(handler.canHandle(undefined)).toBe(false);
      expect(handler.canHandle(123)).toBe(false);
      expect(handler.canHandle({})).toBe(false);
      expect(handler.canHandle([])).toBe(false);
      expect(handler.canHandle(true)).toBe(false);
    });

    it('should return false for strings without template expressions', () => {
      expect(handler.canHandle('regular string')).toBe(false);
      expect(handler.canHandle('string with $ but no braces')).toBe(false);
      expect(handler.canHandle('string with { but no $')).toBe(false);
      expect(handler.canHandle('')).toBe(false);
      expect(handler.canHandle('   ')).toBe(false);
    });

    it('should return false for complete template expressions', () => {
      // These should be handled by ObjectExpressionHandler instead
      jest.spyOn(stringParser, 'isCompleteExpression').mockReturnValue(true);

      expect(handler.canHandle('${user.name}')).toBe(false);
      expect(handler.canHandle(' ${user.name} ')).toBe(false);
      expect(handler.canHandle('\n${user.name}\t')).toBe(false);
    });

    it('should delegate to StringParser.isCompleteExpression correctly', () => {
      const spy = jest.spyOn(stringParser, 'isCompleteExpression');

      // For mixed content, should return false (not complete)
      spy.mockReturnValue(false);
      expect(handler.canHandle('Hello ${user.name}!')).toBe(true);

      // For complete expressions, should return true (is complete)
      spy.mockReturnValue(true);
      expect(handler.canHandle('${user.name}')).toBe(false);

      expect(spy).toHaveBeenCalledWith('Hello ${user.name}!');
      expect(spy).toHaveBeenCalledWith('${user.name}');
    });

    it('should handle strings with $ but no valid template syntax', () => {
      expect(handler.canHandle('Price: $100')).toBe(false);
      expect(handler.canHandle('$variable without braces')).toBe(false);
      expect(handler.canHandle('${incomplete')).toBe(false);
      expect(handler.canHandle('missing$brace}')).toBe(false);
    });
  });

  describe('process', () => {
    const mockVariables = {
      user: {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        profile: {
          title: 'Software Engineer',
          company: 'Tech Corp'
        }
      },
      config: {
        baseUrl: 'https://api.example.com',
        version: 'v1'
      },
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ],
      greeting: 'Hello',
      count: 42
    };

    it('should process simple template expressions in mixed content', () => {
      expect(handler.process('Hello ${user.name}!', mockVariables))
        .toBe('Hello John Doe!');

      expect(handler.process('${user.name} is ${user.age} years old', mockVariables))
        .toBe('John Doe is 30 years old');

      expect(handler.process('Welcome ${user.name}', mockVariables))
        .toBe('Welcome John Doe');
    });

    it('should process multiple template expressions', () => {
      expect(handler.process('${greeting} ${user.name}, you are ${user.age}!', mockVariables))
        .toBe('Hello John Doe, you are 30!');

      expect(handler.process('User: ${user.name}, Email: ${user.email}', mockVariables))
        .toBe('User: John Doe, Email: john@example.com');
    });

    it('should process nested property access', () => {
      expect(handler.process('${user.profile.title} at ${user.profile.company}', mockVariables))
        .toBe('Software Engineer at Tech Corp');

      expect(handler.process('API: ${config.baseUrl}/${config.version}', mockVariables))
        .toBe('API: https://api.example.com/v1');
    });

    it('should process array access and methods', () => {
      expect(handler.process('First item: ${items[0].name}', mockVariables))
        .toBe('First item: Item 1');

      expect(handler.process('Total items: ${items.length}', mockVariables))
        .toBe('Total items: 2');

      expect(handler.process('Item IDs: ${items.map(i => i.id).join(", ")}', mockVariables))
        .toBe('Item IDs: 1, 2');
    });

    it('should handle mathematical expressions', () => {
      expect(handler.process('Count plus 10: ${count + 10}', mockVariables))
        .toBe('Count plus 10: 52');

      expect(handler.process('User age in 5 years: ${user.age + 5}', mockVariables))
        .toBe('User age in 5 years: 35');
    });

    it('should handle conditional expressions', () => {
      expect(handler.process('Status: ${user.age >= 18 ? "adult" : "minor"}', mockVariables))
        .toBe('Status: adult');

      expect(handler.process('Greeting: ${user.name || "Guest"}', mockVariables))
        .toBe('Greeting: John Doe');
    });

    it('should handle string methods and operations', () => {
      expect(handler.process('Uppercase: ${user.name.toUpperCase()}', mockVariables))
        .toBe('Uppercase: JOHN DOE');

      expect(handler.process('Length: ${user.name.length}', mockVariables))
        .toBe('Length: 8');
    });

    it('should handle undefined and null values gracefully', () => {
      expect(handler.process('Missing: ${user.missing}', mockVariables))
        .toBe('Missing: ');

      const variablesWithNull = { ...mockVariables, nullValue: null };
      expect(handler.process('Null: ${nullValue}', variablesWithNull))
        .toBe('Null: ');
    });

    it('should handle complex expressions with JSON operations', () => {
      expect(handler.process('JSON: ${JSON.stringify({name: user.name})}', mockVariables))
        .toBe('JSON: {"name":"John Doe"}');
    });

    it('should handle template expressions with special characters in strings', () => {
      const specialVariables = {
        ...mockVariables,
        message: 'Hello "world" with \'quotes\' and \n newlines'
      };

      expect(handler.process('Message: ${message}', specialVariables))
        .toBe('Message: Hello "world" with \'quotes\' and \n newlines');
    });

    it('should preserve text outside template expressions', () => {
      expect(handler.process('Start ${user.name} middle ${user.age} end', mockVariables))
        .toBe('Start John Doe middle 30 end');

      expect(handler.process('No variables here', mockVariables))
        .toBe('No variables here');
    });

    it('should handle expressions with function calls', () => {
      const variablesWithFunctions = {
        ...mockVariables,
        formatName: (name: string) => name.toLowerCase(),
        multiply: (a: number, b: number) => a * b
      };

      expect(handler.process('Formatted: ${formatName(user.name)}', variablesWithFunctions))
        .toBe('Formatted: john doe');

      expect(handler.process('Result: ${multiply(5, 6)}', variablesWithFunctions))
        .toBe('Result: 30');
    });

    it('should delegate to StringParser.findMatchingBrace', () => {
      const spy = jest.spyOn(stringParser, 'findMatchingBrace');
      spy.mockReturnValue(12); // Mock return value for '${user.name}'

      handler.process('Hello ${user.name}!', mockVariables);

      expect(spy).toHaveBeenCalledWith('Hello ${user.name}!', 8); // Position after '${'
    });

    it('should throw error when StringParser.findMatchingBrace throws', () => {
      jest.spyOn(stringParser, 'findMatchingBrace').mockImplementation(() => {
        throw new Error('Template expression is missing closing brace');
      });

      expect(() => {
        handler.process('Hello ${user.name', mockVariables);
      }).toThrow('Template expression is missing closing brace');
    });

    it('should throw error for invalid JavaScript in expressions', () => {
      expect(() => {
        handler.process('Invalid: ${invalid..syntax}', mockVariables);
      }).toThrow();
    });
  });

  describe('convertToEjsTemplate', () => {
    // Testing the private method through the public process method
    it('should convert simple template expressions to EJS format', () => {
      const spy = jest.spyOn(stringParser, 'findMatchingBrace');
      spy.mockReturnValue(17); // For '${user.name}'

      // We can't directly test the private method, but we can verify the output
      const result = handler.process('Hello ${user.name}!', { user: { name: 'Test' } });
      expect(result).toBe('Hello Test!');

      expect(spy).toHaveBeenCalledWith('Hello ${user.name}!', 8);
    });

    it('should handle multiple expressions correctly', () => {
      const spy = jest.spyOn(stringParser, 'findMatchingBrace');
      spy.mockReturnValueOnce(6) // First ${name}
        .mockReturnValueOnce(16); // Second ${age}

      const result = handler.process('${name} is ${age}', { name: 'John', age: 30 });
      expect(result).toBe('John is 30');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should handle expressions with nested braces', () => {
      const spy = jest.spyOn(stringParser, 'findMatchingBrace');
      spy.mockReturnValue(30); // For complex expression

      const variables = {
        obj: { nested: { value: 'test' } },
        fn: (x: any) => x.toUpperCase()
      };

      const result = handler.process('Result: ${fn(obj.nested.value)}', variables);
      expect(result).toBe('Result: TEST');
    });

    it('should preserve characters between expressions', () => {
      const spy = jest.spyOn(stringParser, 'findMatchingBrace');
      spy.mockReturnValueOnce(3)   // ${a}
        .mockReturnValueOnce(12); // ${b}

      const result = handler.process('${a} and ${b}', { a: 'first', b: 'second' });
      expect(result).toBe('first and second');
    });

    it('should work with empty expressions', () => {
      const spy = jest.spyOn(stringParser, 'findMatchingBrace');
      spy.mockReturnValueOnce(2);

      const result = handler.process('${}', {});
      expect(result).toBe('');
    });
  });

  describe('integration with StringParser', () => {
    it('should work correctly when StringParser methods throw errors', () => {
      jest.spyOn(stringParser, 'isCompleteExpression').mockImplementation(() => {
        throw new Error('StringParser error');
      });

      expect(handler.canHandle('Hello ${test}')).toBe(false);
    });

    it('should work correctly when StringParser returns expected values', () => {
      jest.spyOn(stringParser, 'isCompleteExpression').mockReturnValue(false);
      jest.spyOn(stringParser, 'findMatchingBrace').mockReturnValue(12);

      expect(handler.canHandle('Hello ${user.name}!')).toBe(true);

      const result = handler.process('Hello ${name}!', { name: 'Test' });
      expect(result).toBe('Hello Test!');
    });
  });

  describe('edge cases', () => {
    it('should handle empty template expressions', () => {
      const spy = jest.spyOn(stringParser, 'findMatchingBrace');
      spy.mockReturnValue(9);

      const result = handler.process('Empty: ${}', {});
      expect(result).toBe('Empty: ');
    });

    it('should handle expressions at string boundaries', () => {
      const spy = jest.spyOn(stringParser, 'findMatchingBrace');
      spy.mockReturnValueOnce(7)  // ${start}
        .mockReturnValueOnce(19); // ${end}

      const result = handler.process('${start}middle${end}', { start: 'BEGIN', end: 'FINISH' });
      expect(result).toBe('BEGINmiddleFINISH');
    });

    it('should handle expressions with whitespace', () => {
      const spy = jest.spyOn(stringParser, 'findMatchingBrace');
      spy.mockReturnValue(14); // ${ name }

      const result = handler.process('Hello ${ name }!', { name: 'Test' });
      expect(result).toBe('Hello Test!');
    });

    it('should handle mixed content with no variables', () => {
      const result = handler.process('No variables here at all', {});
      expect(result).toBe('No variables here at all');
    });

    it('should handle strings with dollar signs but no expressions', () => {
      const result = handler.process('Price is $100 and tax is $10', {});
      expect(result).toBe('Price is $100 and tax is $10');
    });
  });
});