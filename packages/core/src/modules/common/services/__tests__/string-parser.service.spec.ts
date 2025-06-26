import { Test, TestingModule } from '@nestjs/testing';
import { StringParser } from '../string-parser.service';

describe('StringParser', () => {
  let service: StringParser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StringParser],
    }).compile();

    service = module.get<StringParser>(StringParser);
  });

  describe('findMatchingBrace', () => {
    describe('successful cases', () => {
      it('should find matching brace for simple expressions', () => {
        expect(service.findMatchingBrace('${test}', 2)).toBe(6);
        expect(service.findMatchingBrace('${user.name}', 2)).toBe(11);
        expect(service.findMatchingBrace('${123}', 2)).toBe(5);
      });

      it('should find matching brace with default startIndex', () => {
        expect(service.findMatchingBrace('${test}')).toBe(6);
        expect(service.findMatchingBrace('${user.name}')).toBe(11);
      });

      it('should handle nested braces correctly', () => {
        expect(service.findMatchingBrace('${obj.prop}', 2)).toBe(10);
        expect(service.findMatchingBrace('${func({key: value})}', 2)).toBe(20);
        expect(service.findMatchingBrace('${{name: "test", age: 30}}', 2)).toBe(25);
      });

      it('should handle deeply nested braces', () => {
        expect(service.findMatchingBrace('${obj.method({nested: {deep: {value: true}}})}', 2)).toBe(45);
        expect(service.findMatchingBrace('${a.b({c: {d: {e: {f: "test"}}}})}', 2)).toBe(33);
      });

      it('should handle string literals with single quotes', () => {
        expect(service.findMatchingBrace('${name === \'test\'}', 2)).toBe(17);
        expect(service.findMatchingBrace('${\'hello world\'}', 2)).toBe(15);
        expect(service.findMatchingBrace('${obj[\'key\']}', 2)).toBe(12);
      });

      it('should handle string literals with double quotes', () => {
        expect(service.findMatchingBrace('${name === "test"}', 2)).toBe(17);
        expect(service.findMatchingBrace('${"hello world"}', 2)).toBe(15);
        expect(service.findMatchingBrace('${obj["key"]}', 2)).toBe(12);
      });

      it('should handle template literals with backticks', () => {
        expect(service.findMatchingBrace('${`hello world`}', 2)).toBe(15);
        expect(service.findMatchingBrace('${`template ${var}`}', 2)).toBe(19);
        expect(service.findMatchingBrace('${func(`arg`)}', 2)).toBe(13);
      });

      it('should handle braces inside string literals', () => {
        expect(service.findMatchingBrace('${"text with {braces}"}', 2)).toBe(22);
        expect(service.findMatchingBrace('${\'text with {braces}\'}', 2)).toBe(22);
        expect(service.findMatchingBrace('${`text with {braces}`}', 2)).toBe(22);
      });

      it('should handle escaped characters in strings', () => {
        expect(service.findMatchingBrace('${"escaped \\"quote\\""}', 2)).toBe(21);
        expect(service.findMatchingBrace('${\'escaped \\\'quote\\\'\'}', 2)).toBe(21);
        expect(service.findMatchingBrace('${"escaped \\n newline"}', 2)).toBe(22);
        expect(service.findMatchingBrace('${"escaped \\\\ backslash"}', 2)).toBe(24);
      });

      it('should handle complex expressions with mixed quotes', () => {
        expect(service.findMatchingBrace('${obj["key"] === \'value\'}', 2)).toBe(24);
        expect(service.findMatchingBrace('${func("arg1", \'arg2\', `arg3`)}', 2)).toBe(30);
      });

      it('should handle expressions in mixed content', () => {
        expect(service.findMatchingBrace('Hello ${user.name}!', 8)).toBe(17);
        expect(service.findMatchingBrace('API ${config.url}/users', 6)).toBe(16);
        expect(service.findMatchingBrace('Start ${x} middle ${y} end', 8)).toBe(9);
        expect(service.findMatchingBrace('Result: ${fn(obj.nested.value)}', 10)).toBe(30);

      });

      it('should handle empty expressions', () => {
        expect(service.findMatchingBrace('${}', 2)).toBe(2);
        expect(service.findMatchingBrace('${ }', 2)).toBe(3);
        expect(service.findMatchingBrace('test ${}', 7)).toBe(7);
      });

      it('should handle expressions with whitespace', () => {
        expect(service.findMatchingBrace('${ user.name }', 2)).toBe(13);
        expect(service.findMatchingBrace('${\n  user.name\n}', 2)).toBe(15);
        expect(service.findMatchingBrace('${\t user.name \t}', 2)).toBe(15);
      });
    });

    describe('error cases', () => {
      it('should throw error for missing closing brace', () => {
        expect(() => service.findMatchingBrace('${test', 2))
          .toThrow('Template expression is missing closing brace: ${test');

        expect(() => service.findMatchingBrace('${user.name', 2))
          .toThrow('Template expression is missing closing brace: ${user.name');
      });

      it('should throw error for unmatched nested braces', () => {
        expect(() => service.findMatchingBrace('${obj.method({key: value}', 2))
          .toThrow('Template expression is missing closing brace: ${obj.method({key: value}');

        expect(() => service.findMatchingBrace('${{nested: {object}', 2))
          .toThrow('Template expression is missing closing brace: ${{nested: {object}');
      });

      it('should throw error for unclosed string literals', () => {
        expect(() => service.findMatchingBrace('${"unclosed string}', 2))
          .toThrow('Template expression is missing closing brace: ${"unclosed string}');

        expect(() => service.findMatchingBrace('${\'unclosed string}', 2))
          .toThrow('Template expression is missing closing brace: ${\'unclosed string}');
      });

      it('should truncate long error messages', () => {
        const longExpression = '${' + 'a'.repeat(100) + '}';
        const longExpressionWithoutClosing = longExpression.slice(0, -1);

        expect(() => service.findMatchingBrace(longExpressionWithoutClosing, 2))
          .toThrow('Template expression is missing closing brace: ' + longExpressionWithoutClosing.slice(0, 50) + '...');
      });

      it('should handle edge case with startIndex beyond string length', () => {
        expect(() => service.findMatchingBrace('${test}', 10))
          .toThrow('Template expression is missing closing brace: ${test}');
      });

      it('should handle edge case with startIndex at string end', () => {
        expect(() => service.findMatchingBrace('${test}', 7))
          .toThrow('Template expression is missing closing brace: ${test}');
      });
    });

    describe('edge cases', () => {
      it('should handle startIndex variations', () => {
        expect(service.findMatchingBrace('prefix${test}suffix', 8)).toBe(12);
        expect(service.findMatchingBrace('${test}', 2)).toBe(6);
      });

      it('should handle complex nested scenarios', () => {
        const complex = '${items.filter(item => item.type === "active").map(item => ({id: item.id, name: item.name}))}';
        expect(service.findMatchingBrace(complex, 2)).toBe(complex.length - 1);
      });

      it('should handle function calls with object literals', () => {
        expect(service.findMatchingBrace('${func({a: 1, b: {c: 2}})}', 2)).toBe(25);
        expect(service.findMatchingBrace('${callback({success: true, data: {items: []}})}', 2)).toBe(46);
      });

      it('should handle array literals with nested objects', () => {
        expect(service.findMatchingBrace('${[{a: 1}, {b: 2}]}', 2)).toBe(18);
        expect(service.findMatchingBrace('${users.map(u => ({id: u.id, name: u.name}))}', 2)).toBe(44);
      });
    });
  });

  describe('isCompleteExpression', () => {
    describe('successful cases', () => {
      it('should return true for complete expressions', () => {
        expect(service.isCompleteExpression('${test}')).toBe(true);
        expect(service.isCompleteExpression('${user.name}')).toBe(true);
        expect(service.isCompleteExpression('${123}')).toBe(true);
        expect(service.isCompleteExpression('${obj.method()}')).toBe(true);
      });

      it('should return true for complete expressions with whitespace', () => {
        expect(service.isCompleteExpression(' ${test} ')).toBe(true);
        expect(service.isCompleteExpression('\n${user.name}\t')).toBe(true);
        expect(service.isCompleteExpression('  ${obj.prop}  ')).toBe(true);
      });

      it('should return true for complex complete expressions', () => {
        expect(service.isCompleteExpression('${obj.method({key: "value"})}')).toBe(true);
        expect(service.isCompleteExpression('${users.filter(u => u.active)}')).toBe(true);
        expect(service.isCompleteExpression('${{name: "test", age: 30}}')).toBe(true);
      });

      it('should return true for expressions with nested braces', () => {
        expect(service.isCompleteExpression('${func({nested: {deep: true}})}')).toBe(true);
        expect(service.isCompleteExpression('${items.map(item => ({id: item.id}))}')).toBe(true);
      });

      it('should return true for expressions with string literals containing braces', () => {
        expect(service.isCompleteExpression('${"text with {braces}"}')).toBe(true);
        expect(service.isCompleteExpression('${\'text with {braces}\'}')).toBe(true);
        expect(service.isCompleteExpression('${`text with {braces}`}')).toBe(true);
      });

      it('should return false for mixed content with expressions', () => {
        expect(service.isCompleteExpression('Hello ${user.name}!')).toBe(false);
        expect(service.isCompleteExpression('${greeting} world')).toBe(false);
        expect(service.isCompleteExpression('prefix ${value} suffix')).toBe(false);
      });

      it('should return false for multiple expressions', () => {
        expect(service.isCompleteExpression('${first} ${second}')).toBe(false);
        expect(service.isCompleteExpression('${a} and ${b}')).toBe(false);
      });

      it('should return false for non-template strings', () => {
        expect(service.isCompleteExpression('regular string')).toBe(false);
        expect(service.isCompleteExpression('string with $ but no braces')).toBe(false);
        expect(service.isCompleteExpression('string with {braces} but no $')).toBe(false);
        expect(service.isCompleteExpression('')).toBe(false);
        expect(service.isCompleteExpression('   ')).toBe(false);
      });

      it('should return false for malformed expressions', () => {
        expect(service.isCompleteExpression('${')).toBe(false);
        expect(service.isCompleteExpression('${}')).toBe(false);
        expect(service.isCompleteExpression('$')).toBe(false);
        expect(service.isCompleteExpression('{')).toBe(false);
      });

      it('should return false for short strings', () => {
        expect(service.isCompleteExpression('$')).toBe(false);
        expect(service.isCompleteExpression('${')).toBe(false);
        expect(service.isCompleteExpression('${}')).toBe(false); // Length 3, but needs content
      });
    });

    describe('error cases', () => {
      it('should throw error for incomplete expressions', () => {
        expect(() => service.isCompleteExpression('${test'))
          .toThrow('Template expression is missing closing brace');

        expect(() => service.isCompleteExpression('${user.name'))
          .toThrow('Template expression is missing closing brace');
      });

      it('should throw error for unmatched braces', () => {
        expect(() => service.isCompleteExpression('${obj.method({key: value}'))
          .toThrow('Template expression is missing closing brace');
      });

      it('should throw error for unclosed strings', () => {
        expect(() => service.isCompleteExpression('${"unclosed string}'))
          .toThrow('Template expression is missing closing brace');
      });
    });

    describe('edge cases', () => {
      it('should handle expressions at minimum valid length', () => {
        expect(service.isCompleteExpression('${a}')).toBe(true);
        expect(service.isCompleteExpression('${1}')).toBe(true);
      });

      it('should handle complex real-world expressions', () => {
        expect(service.isCompleteExpression('${users.find(u => u.id === userId)?.name || "Unknown"}')).toBe(true);
        expect(service.isCompleteExpression('${Object.keys(data).map(key => ({key, value: data[key]}))}')).toBe(true);
      });

      it('should handle expressions with various quote combinations', () => {
        expect(service.isCompleteExpression('${obj["key"] === \'value\'}')).toBe(true);
        expect(service.isCompleteExpression('${func("arg1", \'arg2\', `arg3`)}')).toBe(true);
      });
    });
  });

  describe('extractExpressionContent', () => {
    describe('successful cases', () => {
      it('should extract content from simple expressions', () => {
        expect(service.extractExpressionContent('${test}')).toBe('test');
        expect(service.extractExpressionContent('${user.name}')).toBe('user.name');
        expect(service.extractExpressionContent('${123}')).toBe('123');
      });

      it('should extract content with whitespace handling', () => {
        expect(service.extractExpressionContent(' ${test} ')).toBe('test');
        expect(service.extractExpressionContent('\n${user.name}\t')).toBe('user.name');
        expect(service.extractExpressionContent('  ${ obj.prop }  ')).toBe('obj.prop');
      });

      it('should extract content from complex expressions', () => {
        expect(service.extractExpressionContent('${obj.method({key: "value"})}')).toBe('obj.method({key: "value"})');
        expect(service.extractExpressionContent('${users.filter(u => u.active)}')).toBe('users.filter(u => u.active)');
        expect(service.extractExpressionContent('${{name: "test", age: 30}}')).toBe('{name: "test", age: 30}');
      });

      it('should extract content with nested braces', () => {
        expect(service.extractExpressionContent('${func({nested: {deep: true}})}')).toBe('func({nested: {deep: true}})');
        expect(service.extractExpressionContent('${items.map(item => ({id: item.id}))}')).toBe('items.map(item => ({id: item.id}))');
      });

      it('should extract content with string literals containing braces', () => {
        expect(service.extractExpressionContent('${"text with {braces}"}')).toBe('"text with {braces}"');
        expect(service.extractExpressionContent('${\'text with {braces}\'}')).toBe('\'text with {braces}\'');
        expect(service.extractExpressionContent('${`text with {braces}`}')).toBe('`text with {braces}`');
      });

      it('should extract content with escaped characters', () => {
        expect(service.extractExpressionContent('${"escaped \\"quote\\""}')).toBe('"escaped \\"quote\\""');
        expect(service.extractExpressionContent('${\'escaped \\\'quote\\\'\'}')).toBe('\'escaped \\\'quote\\\'\'');
        expect(service.extractExpressionContent('${"escaped \\n newline"}')).toBe('"escaped \\n newline"');
      });

      it('should extract empty content', () => {
        expect(service.extractExpressionContent('${}')).toBe('');
        expect(service.extractExpressionContent('${ }')).toBe('');
        expect(service.extractExpressionContent('${\n}')).toBe('');
      });

      it('should handle whitespace in extracted content', () => {
        expect(service.extractExpressionContent('${ user.name }')).toBe('user.name');
        expect(service.extractExpressionContent('${\n  complex.expression  \n}')).toBe('complex.expression');
        expect(service.extractExpressionContent('${\t\tvalue\t\t}')).toBe('value');
      });
    });

    describe('error cases', () => {
      it('should throw error for incomplete expressions', () => {
        expect(() => service.extractExpressionContent('${test'))
          .toThrow('Template expression is missing closing brace');

        expect(() => service.extractExpressionContent('${user.name'))
          .toThrow('Template expression is missing closing brace');
      });

      it('should throw error for unmatched braces', () => {
        expect(() => service.extractExpressionContent('${obj.method({key: value}'))
          .toThrow('Template expression is missing closing brace');
      });

      it('should throw error for unclosed strings', () => {
        expect(() => service.extractExpressionContent('${"unclosed string}'))
          .toThrow('Template expression is missing closing brace');
      });

      it('should throw error for malformed input', () => {
        expect(() => service.extractExpressionContent('${'))
          .toThrow('Template expression is missing closing brace');
      });
    });

    describe('edge cases', () => {
      it('should handle minimal valid expressions', () => {
        expect(service.extractExpressionContent('${a}')).toBe('a');
        expect(service.extractExpressionContent('${1}')).toBe('1');
        expect(service.extractExpressionContent('${_}')).toBe('_');
      });

      it('should handle complex real-world expressions', () => {
        const complexExpression = '${users.find(u => u.id === userId)?.name || "Unknown"}';
        expect(service.extractExpressionContent(complexExpression))
          .toBe('users.find(u => u.id === userId)?.name || "Unknown"');

        const anotherComplex = '${Object.keys(data).map(key => ({key, value: data[key]}))}';
        expect(service.extractExpressionContent(anotherComplex))
          .toBe('Object.keys(data).map(key => ({key, value: data[key]}))');
      });

      it('should handle expressions with multiple quote types', () => {
        expect(service.extractExpressionContent('${obj["key"] === \'value\'}')).toBe('obj["key"] === \'value\'');
        expect(service.extractExpressionContent('${func("arg1", \'arg2\', `arg3`)}')).toBe('func("arg1", \'arg2\', `arg3`)');
      });

      it('should handle deeply nested structures', () => {
        const deepNested = '${data.level1.level2.level3.method({param: {nested: {deep: "value"}}})}';
        expect(service.extractExpressionContent(deepNested))
          .toBe('data.level1.level2.level3.method({param: {nested: {deep: "value"}}})');
      });
    });
  });

  describe('integration between methods', () => {
    it('should work consistently across all methods', () => {
      const expressions = [
        '${simple}',
        '${user.name}',
        '${obj.method()}',
        '${complex.filter(x => x.active)}',
        '${{key: "value"}}',
        '${func({nested: {deep: true}})}'
      ];

      expressions.forEach(expr => {
        expect(service.isCompleteExpression(expr)).toBe(true);
        const content = service.extractExpressionContent(expr);
        const braceIndex = service.findMatchingBrace(expr);
        expect(expr.slice(2, braceIndex).trim()).toBe(content);
      });
    });

    it('should handle error propagation consistently', () => {
      const malformedExpressions = [
        '${incomplete',
        '${unclosed "string}',
        '${unmatched {brace}'
      ];

      malformedExpressions.forEach(expr => {
        expect(() => service.isCompleteExpression(expr)).toThrow();
        expect(() => service.extractExpressionContent(expr)).toThrow();
        expect(() => service.findMatchingBrace(expr)).toThrow();
      });
    });
  });
});