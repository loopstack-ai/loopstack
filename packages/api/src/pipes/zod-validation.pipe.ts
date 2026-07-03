import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message));
}

/**
 * Validates a request body (or param) against a zod schema from
 * `@loopstack/contracts` and returns the parsed, typed value.
 */
@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: z.ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: formatIssues(result.error),
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    return result.data;
  }
}

/**
 * Parses a JSON-encoded query parameter (e.g. `?filter={"workspaceId":"…"}`)
 * and validates it against a zod schema. Absent parameters resolve to
 * `undefined`.
 */
@Injectable()
export class ZodJsonQueryPipe<TOutput> implements PipeTransform<unknown, TOutput | undefined> {
  constructor(private readonly schema: z.ZodType<TOutput>) {}

  transform(value: unknown, metadata: { data?: string }): TOutput | undefined {
    if (value === undefined || value === null) return undefined;

    let parsed: unknown = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        throw new BadRequestException(`Invalid JSON for query parameter '${metadata.data}'`);
      }
    }

    const result = this.schema.safeParse(parsed);
    if (!result.success) {
      throw new BadRequestException(
        `Validation failed for '${metadata.data}': ${formatIssues(result.error).join('; ')}`,
      );
    }
    return result.data;
  }
}
