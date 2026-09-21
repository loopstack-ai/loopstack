import { describe, expect, it } from 'vitest';
import * as schemas from './index.js';

/**
 * Transitions are declared with the `@Transition` / `@Guard` decorators and routed off that
 * metadata by the engine. The schemas here are read contracts for what the API serializes,
 * so they must not grow a config-driven authoring model or an expression syntax: these
 * schemas are the first thing a reader consults when asking how to declare a transition,
 * and anything they describe needs an executor behind it.
 */
describe('workflow transition contract', () => {
  const unsupported = [
    'TemplateExpression',
    'WorkflowTransitionConfigSchema',
    'AssignmentSchema',
    'AssignmentConfigSchema',
    'ToolCallSchema',
    'ToolCallConfigSchema',
  ];

  it.each(unsupported)('does not export %s', (name) => {
    expect(schemas).not.toHaveProperty(name);
  });

  it('exports a single WorkflowTransitionSchema describing the serialized transition', () => {
    expect(schemas.WorkflowTransitionSchema).toBeDefined();

    const parsed = schemas.WorkflowTransitionSchema.parse({
      id: 'checkAuth',
      from: 'start',
      to: 'authed',
      trigger: 'onEntry',
      guard: 'needsAuth',
    });

    expect(parsed).toEqual({
      id: 'checkAuth',
      from: 'start',
      to: 'authed',
      trigger: 'onEntry',
      guard: 'needsAuth',
    });
  });

  it.each(['if', 'call', 'assign', 'onError', 'debug'])('rejects the unsupported field %s', (field) => {
    const result = schemas.WorkflowTransitionSchema.safeParse({
      id: 'checkAuth',
      from: 'start',
      to: 'authed',
      [field]: 'anything',
    });

    expect(result.success).toBe(false);
  });

  it('accepts only the two concrete triggers', () => {
    const result = schemas.WorkflowTransitionSchema.safeParse({
      id: 'checkAuth',
      from: 'start',
      to: 'authed',
      trigger: 'someExpression()',
    });

    expect(result.success).toBe(false);
  });
});
