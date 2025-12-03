import { z } from 'zod';

export interface SchemaTestCase {
  description: string;
  args: any;
  shouldPass: boolean;
  expectedError?: string;
}

export function testSchema(schema: z.ZodSchema, testCase: SchemaTestCase): void {
  const result = schema.safeParse(testCase.args);
  expect(result.success).toBe(testCase.shouldPass);

  if (!testCase.shouldPass && testCase.expectedError && !result.success) {
    expect(result.error.message).toContain(testCase.expectedError);
  }
}

export function describeSchemaTests(fn: () => z.ZodType, testCases: SchemaTestCase[]): void {
  testCases.forEach((testCase) => {
    const expectation = testCase.shouldPass ? 'should accept' : 'should reject';

    it(`${expectation}: ${testCase.description}`, () => {
      testSchema(fn(), testCase);
    });
  });
}
