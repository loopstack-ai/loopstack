import { z } from 'zod';
import { BaseWorkflow, Guard, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

interface DynamicRoutingState {
  value: number;
}

const DynamicRoutingArgsSchema = z
  .object({
    value: z.number().default(150),
  })
  .strict();

type DynamicRoutingArgs = z.infer<typeof DynamicRoutingArgsSchema>;

@Workflow({
  title: 'Advanced - Dynamic Routing Example',
  description:
    'Conditional routing using @Guard decorators and transition priorities — branching on runtime values without explicit state machines.',
  schema: DynamicRoutingArgsSchema,
})
export class DynamicRoutingExampleWorkflow extends BaseWorkflow<DynamicRoutingArgs> {
  // --- Initial transition ---

  @Transition({ to: 'prepared' })
  async createMockData(state: DynamicRoutingState, ctx: RunContext<DynamicRoutingArgs>) {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Analyzing value = ${ctx.args.value}`,
    });
    this.assignState({ value: ctx.args.value });
  }

  // --- First routing fork (from 'prepared') ---

  @Transition({ from: 'prepared', to: 'placeA', priority: 10 })
  @Guard('isAbove100')
  routeToPlaceA() {}

  isAbove100(state: DynamicRoutingState): boolean {
    return state.value > 100;
  }

  @Transition({ from: 'prepared', to: 'placeB' })
  routeToPlaceB() {} // no priority -> evaluated last, acts as fallback

  // --- Second routing fork (from 'placeA') ---

  @Transition({ from: 'placeA', to: 'placeC', priority: 10 })
  @Guard('isAbove200')
  routeToPlaceC() {}

  isAbove200(state: DynamicRoutingState): boolean {
    return state.value > 200;
  }

  @Transition({ from: 'placeA', to: 'placeD' })
  routeToPlaceD() {} // no priority -> evaluated last, acts as fallback

  // --- Terminal transitions ---

  @Transition({ from: 'placeB', to: 'end' })
  async showMessagePlaceB() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is less or equal 100',
    });
  }

  @Transition({ from: 'placeC', to: 'end' })
  async showMessagePlaceC() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is greater than 200',
    });
  }

  @Transition({ from: 'placeD', to: 'end' })
  async showMessagePlaceD() {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is less or equal 200, but greater than 100',
    });
  }
}
