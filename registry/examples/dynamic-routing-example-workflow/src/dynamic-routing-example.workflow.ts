import { z } from 'zod';
import { BaseWorkflow, Guard, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

interface DynamicRoutingState {
  value: number;
}

@Workflow({
  title: 'Dynamic Routing',
  description:
    'This workflow demonstrates dynamic routing based on the value of a variable.\nIt uses guards and priority to determine the next transition based on conditions.',
  schema: z
    .object({
      value: z.number().default(150),
    })
    .strict(),
})
export class DynamicRoutingExampleWorkflow extends BaseWorkflow<{ value: number }, DynamicRoutingState> {
  // --- Initial transition ---

  @Transition({ to: 'prepared' })
  async createMockData(state: DynamicRoutingState, ctx: RunContext): Promise<DynamicRoutingState> {
    const args = ctx.args as { value: number };
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `Analysing value = ${args.value}`,
    });
    return { ...state, value: args.value };
  }

  // --- First routing fork (from 'prepared') ---

  @Transition({ from: 'prepared', to: 'placeA', priority: 10 })
  @Guard('isAbove100')
  async routeToPlaceA(state: DynamicRoutingState): Promise<DynamicRoutingState> {
    return state;
  }

  isAbove100(state: DynamicRoutingState): boolean {
    return state.value > 100;
  }

  @Transition({ from: 'prepared', to: 'placeB' })
  async routeToPlaceB(state: DynamicRoutingState): Promise<DynamicRoutingState> {
    return state;
  } // no priority -> evaluated last, acts as fallback

  // --- Second routing fork (from 'placeA') ---

  @Transition({ from: 'placeA', to: 'placeC', priority: 10 })
  @Guard('isAbove200')
  async routeToPlaceC(state: DynamicRoutingState): Promise<DynamicRoutingState> {
    return state;
  }

  isAbove200(state: DynamicRoutingState): boolean {
    return state.value > 200;
  }

  @Transition({ from: 'placeA', to: 'placeD' })
  async routeToPlaceD(state: DynamicRoutingState): Promise<DynamicRoutingState> {
    return state;
  } // no priority -> evaluated last, acts as fallback

  // --- Terminal transitions ---

  @Transition({ from: 'placeB', to: 'end' })
  async showMessagePlaceB(_state: DynamicRoutingState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is less or equal 100',
    });
    return {};
  }

  @Transition({ from: 'placeC', to: 'end' })
  async showMessagePlaceC(_state: DynamicRoutingState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is greater than 200',
    });
    return {};
  }

  @Transition({ from: 'placeD', to: 'end' })
  async showMessagePlaceD(_state: DynamicRoutingState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Value is less or equal 200, but greater than 100',
    });
    return {};
  }
}
