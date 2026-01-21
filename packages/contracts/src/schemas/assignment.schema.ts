import { z } from 'zod';
import { TemplateExpression } from './template-expression.schema';

export const AssignmentSchema = z.record(
  z.string(),
  z.union([
    z.null(), // ~ in YAML becomes null
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.any()),
  ]),
);

export const AssignmentConfigSchema = z.record(
  z.string(),
  z.union([
    z.null(), // ~ in YAML becomes null
    TemplateExpression,
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.any()),
  ]),
);
