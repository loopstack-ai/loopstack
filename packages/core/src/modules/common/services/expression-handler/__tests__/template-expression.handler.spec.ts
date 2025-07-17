import { Test, TestingModule } from '@nestjs/testing';
import { TemplateExpressionHandler } from '../template-expression.handler';
import { HandlebarsProcessor } from '../../handlebars-processor.service';
import { VariableSanitizerService } from '../../variable-sanitizer.service';
import {
  DateFormatterHelperService,
  OperatorsHelperService,
} from '../../handlebars-helpers';

describe('TemplateExpressionHandler', () => {
  let handler: TemplateExpressionHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateExpressionHandler,
        HandlebarsProcessor,
        VariableSanitizerService,
        DateFormatterHelperService,
        OperatorsHelperService,
      ],
    }).compile();

    await module.init();

    handler = module.get<TemplateExpressionHandler>(TemplateExpressionHandler);
  });

  describe('canHandle', () => {
    it('should return true for mixed content with template expressions', () => {
      expect(handler.canHandle('Hello {{user.name}}!')).toBe(true);
      expect(handler.canHandle('{{user.name}} is {{user.age}} years old')).toBe(
        true,
      );
      expect(
        handler.canHandle(
          'Welcome {{user.name}}, you have {{notifications.length}} notifications',
        ),
      ).toBe(true);
      expect(handler.canHandle('{{greeting}} {{user.name}}!')).toBe(true);
    });

    it('should return true for strings with multiple template expressions', () => {
      expect(handler.canHandle('{{first}} and {{second}} and {{third}}')).toBe(
        true,
      );
      expect(
        handler.canHandle(
          'User: {{user.name}}, Email: {{user.email}}, Age: {{user.age}}',
        ),
      ).toBe(true);
      expect(
        handler.canHandle('API: {{config.baseUrl}}/users/{{userId}}'),
      ).toBe(true);
    });

    it('should return true for template expressions with leading/trailing text', () => {
      expect(handler.canHandle('Prefix {{variable}} suffix')).toBe(true);
      expect(handler.canHandle('{{variable}} only has suffix')).toBe(true);
      expect(handler.canHandle('only has prefix {{variable}}')).toBe(true);
    });

    it('should return false for template expressions which are pure expressions', () => {
      expect(handler.canHandle('   ${{variable}}   ')).toBe(false);
      expect(handler.canHandle('${{variable}}   ')).toBe(false);
      expect(
        handler.canHandle(`
        \${{variable}

      `),
      ).toBe(false);
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
      expect(handler.canHandle('{{user.name}}')).toBe(true);
      expect(handler.canHandle('${{user.name}}')).toBe(false);
      expect(handler.canHandle(' ${{user.name}} ')).toBe(false);
      expect(handler.canHandle('\n${{user.name}}\t')).toBe(false);
    });

    it('should handle strings with $ but no valid template syntax', () => {
      expect(handler.canHandle('Price: $100')).toBe(false);
      expect(handler.canHandle('$variable without braces')).toBe(false);
      expect(handler.canHandle('{{incomplete}')).toBe(false);
      expect(handler.canHandle('missing$brace}}')).toBe(false);
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
          company: 'Tech Corp',
        },
      },
      config: {
        baseUrl: 'https://api.example.com',
        version: 'v1',
      },
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
      greeting: 'Hello',
      count: 42,
    };

    it('should process simple template expressions in mixed content', () => {
      expect(handler.process('Hello {{user.name}}!', mockVariables)).toBe(
        'Hello John Doe!',
      );

      expect(
        handler.process(
          '{{user.name}} is {{user.age}} years old',
          mockVariables,
        ),
      ).toBe('John Doe is 30 years old');

      expect(handler.process('Welcome {{user.name}}', mockVariables)).toBe(
        'Welcome John Doe',
      );
    });

    it('should process multiple template expressions', () => {
      expect(
        handler.process(
          '{{greeting}} {{user.name}}, you are {{user.age}}!',
          mockVariables,
        ),
      ).toBe('Hello John Doe, you are 30!');

      expect(
        handler.process(
          'User: {{user.name}}, Email: {{user.email}}',
          mockVariables,
        ),
      ).toBe('User: John Doe, Email: john@example.com');
    });

    it('should process nested property access', () => {
      expect(
        handler.process(
          '{{user.profile.title}} at {{user.profile.company}}',
          mockVariables,
        ),
      ).toBe('Software Engineer at Tech Corp');

      expect(
        handler.process(
          'API: {{config.baseUrl}}/{{config.version}}',
          mockVariables,
        ),
      ).toBe('API: https://api.example.com/v1');
    });

    it('should handle date helpers', () => {
      expect(handler.process('{{ currentDate }}', mockVariables)).toContain(
        ':',
      );
    });

    it('should handle undefined and null values gracefully', () => {
      expect(handler.process('Missing: {{user.missing}}', mockVariables)).toBe(
        'Missing: ',
      );

      const variablesWithNull = { ...mockVariables, nullValue: null };
      expect(handler.process('Null: {{nullValue}}', variablesWithNull)).toBe(
        'Null: ',
      );
    });

    it('should handle template expressions with special characters in strings', () => {
      const specialVariables = {
        ...mockVariables,
        message: 'Hello "world" with \'quotes\' and \n newlines',
      };

      expect(handler.process('Message: {{message}}', specialVariables)).toBe(
        'Message: Hello "world" with \'quotes\' and \n newlines',
      );
    });

    it('should preserve text outside template expressions', () => {
      expect(
        handler.process(
          'Start {{user.name}} middle {{user.age}} end',
          mockVariables,
        ),
      ).toBe('Start John Doe middle 30 end');

      expect(handler.process('No variables here', mockVariables)).toBe(
        'No variables here',
      );
    });

    it('should throw error for invalid JavaScript in expressions', () => {
      expect(() => {
        handler.process('Invalid: {{invalid..syntax}}', mockVariables);
      }).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty template expressions', () => {
      expect(() => handler.process('Empty: {{}}', {})).toThrow();
    });

    it('should handle expressions at string boundaries', () => {
      const result = handler.process('{{start}}middle{{end}}', {
        start: 'BEGIN',
        end: 'FINISH',
      });
      expect(result).toBe('BEGINmiddleFINISH');
    });

    it('should handle expressions with whitespace', () => {
      const result = handler.process('Hello {{ name }}!', { name: 'Test' });
      expect(result).toBe('Hello Test!');
    });
  });
});
