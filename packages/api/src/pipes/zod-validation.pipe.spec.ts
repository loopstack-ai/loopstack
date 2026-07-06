import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodJsonQueryPipe, ZodValidationPipe } from '@loopstack/common';
import { DocumentSortByQuerySchema, WorkflowSortByQuerySchema } from '../schemas/sort-by.schemas.js';

const schema = z.object({ name: z.string().min(1), count: z.number().optional() });

describe('ZodValidationPipe', () => {
  it('returns the parsed value and strips unknown keys', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ name: 'ok', extra: true })).toEqual({ name: 'ok' });
  });

  it('throws BadRequestException with per-field messages', () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ count: 'NaN' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { message: string[]; statusCode: number };
      expect(response.statusCode).toBe(400);
      expect(response.message.join(' ')).toContain('name');
      expect(response.message.join(' ')).toContain('count');
    }
  });
});

describe('ZodJsonQueryPipe', () => {
  const pipe = new ZodJsonQueryPipe(schema);

  it('resolves absent parameters to undefined', () => {
    expect(pipe.transform(undefined, { data: 'filter' })).toBeUndefined();
    expect(pipe.transform(null, { data: 'filter' })).toBeUndefined();
  });

  it('parses JSON strings', () => {
    expect(pipe.transform('{"name":"ok"}', { data: 'filter' })).toEqual({ name: 'ok' });
  });

  it('rejects malformed JSON', () => {
    expect(() => pipe.transform('{nope', { data: 'filter' })).toThrow(BadRequestException);
  });

  it('rejects schema violations with the parameter name', () => {
    expect(() => pipe.transform('{"name":""}', { data: 'filter' })).toThrow(/filter/);
  });
});

describe('sort-by query schemas', () => {
  it('accepts real entity columns and rejects unknown fields', () => {
    expect(WorkflowSortByQuerySchema.safeParse([{ field: 'createdAt', order: 'DESC' }]).success).toBe(true);
    expect(WorkflowSortByQuerySchema.safeParse([{ field: 'dropTable', order: 'DESC' }]).success).toBe(false);
    expect(DocumentSortByQuerySchema.safeParse([{ field: 'index', order: 'ASC' }]).success).toBe(true);
    expect(DocumentSortByQuerySchema.safeParse([{ field: 'nope', order: 'ASC' }]).success).toBe(false);
  });
});
