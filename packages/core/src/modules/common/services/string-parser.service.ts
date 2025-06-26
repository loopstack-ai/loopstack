import { Injectable } from '@nestjs/common';

@Injectable()
export class StringParser {
  /**
   * Finds the matching closing brace for a template expression
   * Handles nested braces and string literals correctly
   * @throws Error if no matching brace is found
   */
  findMatchingBrace(text: string, startIndex: number = 2): number {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let escaped = false;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
        continue;
      }

      if (inString) {
        if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        continue;
      }

      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        if (braceCount === 0) {
          return i;
        }
        braceCount--;
      }
    }

    throw new Error(`Template expression is missing closing brace: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`);
  }

  /**
   * Checks if a string is a complete template expression (starts with ${ and ends with })
   * @throws Error if the expression is malformed (missing closing brace)
   */
  isCompleteExpression(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed.startsWith('${') || trimmed.length < 4) {
      return false;
    }

    const closingIndex = this.findMatchingBrace(trimmed);
    return trimmed.slice(closingIndex + 1).trim() === '';
  }

  /**
   * Extracts the content inside a template expression
   * @throws Error if the expression is malformed (missing closing brace)
   */
  extractExpressionContent(value: string): string {
    const trimmed = value.trim();
    const closingIndex = this.findMatchingBrace(trimmed);
    return trimmed.slice(2, closingIndex).trim();
  }
}