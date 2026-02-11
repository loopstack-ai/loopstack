import { z } from 'zod';

export const TemplateExpression = z
  .string()
  .regex(/^(?:\||>)?(?:[-+])?\s*\$\{\{([\s\S]*?)\}\}\s*$/, "Must be an expression in format '${{ expression }}'");
