---
title: Dynamic Routing
description: Conditional workflow routing using @Guard decorators and priority-based transition selection when multiple transitions share the same source state.
---

# Dynamic Routing

Route workflows conditionally using `@Guard` decorators and `priority` to control which transition fires when multiple transitions share the same source state.

## Basic Guard

```typescript
@Transition({ from: 'check', to: 'high', priority: 10 })
@Guard('isHigh')
async routeHigh(state: MyState): Promise<MyState> {
  return state;
}

@Transition({ from: 'check', to: 'low' })
async routeLow(state: MyState): Promise<MyState> {
  return state;
}  // Fallback — no guard

isHigh(state: MyState): boolean {
  return state.value > 100;
}
```

**How it works:**

1. Transitions with higher `priority` are checked first
2. The `@Guard` references a method that returns a boolean
3. First transition whose guard returns `true` fires
4. A transition without `@Guard` acts as the fallback

## Multi-Level Routing

Chain routing decisions with cascading forks:

```typescript
import { z } from 'zod';
import { BaseWorkflow, Guard, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { MessageDocument } from '@loopstack/common';

interface RoutingState {
  value?: number;
}

const RoutingSchema = z.object({ value: z.number().default(150) }).strict();
type RoutingArgs = z.infer<typeof RoutingSchema>;

@Workflow({
  schema: RoutingSchema,
})
export class DynamicRoutingExampleWorkflow extends BaseWorkflow<RoutingArgs> {
  @Transition({ to: 'prepared' })
  async createMockData(state: RoutingState, ctx: RunContext<RoutingArgs>): Promise<RoutingState> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Analysing value = ${ctx.args.value}`,
    });
    return { ...state, value: ctx.args.value };
  }

  // First fork: value > 100?
  @Transition({ from: 'prepared', to: 'placeA', priority: 10 })
  @Guard('isAbove100')
  async routeToPlaceA(state: RoutingState): Promise<RoutingState> {
    return state;
  }

  @Transition({ from: 'prepared', to: 'placeB' })
  async routeToPlaceB(state: RoutingState): Promise<RoutingState> {
    return state;
  } // Fallback: value <= 100

  isAbove100(state: RoutingState): boolean {
    return (state.value ?? 0) > 100;
  }

  // Second fork: value > 200?
  @Transition({ from: 'placeA', to: 'placeC', priority: 10 })
  @Guard('isAbove200')
  async routeToPlaceC(state: RoutingState): Promise<RoutingState> {
    return state;
  }

  @Transition({ from: 'placeA', to: 'placeD' })
  async routeToPlaceD(state: RoutingState): Promise<RoutingState> {
    return state;
  } // Fallback: 100 < value <= 200

  isAbove200(state: RoutingState): boolean {
    return (state.value ?? 0) > 200;
  }

  // Terminal transitions
  @Transition({ from: 'placeB', to: 'end' })
  async showMessagePlaceB(state: RoutingState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, { role: 'assistant', text: 'Value is less or equal 100' });
    return {};
  }

  @Transition({ from: 'placeC', to: 'end' })
  async showMessagePlaceC(state: RoutingState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, { role: 'assistant', text: 'Value is greater than 200' });
    return {};
  }

  @Transition({ from: 'placeD', to: 'end' })
  async showMessagePlaceD(state: RoutingState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is less or equal 200, but greater than 100',
    });
    return {};
  }
}
```

## Routing Flow

```
prepared → [value > 100?]
             ├─ yes → placeA → [value > 200?]
             │                    ├─ yes → placeC (done)
             │                    └─ no  → placeD (done)
             └─ no  → placeB (done)
```

## Common Patterns

### Tool Call Routing

Route based on LLM response (see [AI Tool Calling](../ai/tool-calling.md)):

```typescript
@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state: MyState): Promise<MyState> { ... }

@Transition({ from: 'prompt_executed', to: 'end' })
async respond(state: MyState): Promise<unknown> { ... }  // Fallback: no tool calls

hasToolCalls(state: MyState): boolean {
  return state.llmResult?.message.stopReason === 'tool_use';
}
```

### Error-Based Routing

Route based on a tool's error response:

```typescript
@Transition({ from: 'fetched', to: 'auth_needed', priority: 10 })
@Guard('needsAuth')
async startAuth(state: MyState): Promise<MyState> { ... }

@Transition({ from: 'fetched', to: 'end' })
async displayResults(state: MyState): Promise<unknown> { ... }

needsAuth(state: MyState): boolean {
  return state.fetchResult?.error === 'unauthorized';
}
```

## Guard Method Rules

- Guard methods must return a **boolean** (or truthy/falsy value)
- They receive `state` as their first parameter
- They should be **synchronous** — no async guards
- Use descriptive names: `hasToolCalls`, `isAbove100`, `needsAuth`

## Registry References

- [dynamic-routing-example-workflow](https://loopstack.ai/registry/loopstack-dynamic-routing-example-workflow) — Multi-level guard-based routing with cascading forks
- [tool-call-example-workflow](https://loopstack.ai/registry/loopstack-tool-call-example-workflow) — Guard-based routing for LLM tool call detection
