import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseWorkflow,
  DOCUMENT_STORE,
  Final,
  Guard,
  Initial,
  MessageDocument,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { DocumentStore, WorkflowContext } from '@loopstack/common';

interface DynamicRoutingState {
  value: number;
}

@Workflow({
  title: 'Dynamic Routing',
  uiConfig: __dirname + '/dynamic-routing-example.ui.yaml',
  schema: z
    .object({
      value: z.number().default(150),
    })
    .strict(),
})
export class DynamicRoutingExampleWorkflow extends BaseWorkflow<{ value: number }, DynamicRoutingState> {
  constructor(@Inject(DOCUMENT_STORE) private readonly documentStore: DocumentStore) {
    super();
  }

  // --- Initial transition ---

  @Initial({ to: 'prepared' })
  async createMockData(
    ctx: WorkflowContext,
    args: { value: number },
    state: DynamicRoutingState,
  ): Promise<DynamicRoutingState> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Analysing value = ${args.value}`,
    });
    return { ...state, value: args.value };
  }

  // --- First routing fork (from 'prepared') ---

  @Transition({ from: 'prepared', to: 'placeA', priority: 10 })
  @Guard('isAbove100')
  async routeToPlaceA(ctx: WorkflowContext, state: DynamicRoutingState): Promise<DynamicRoutingState> {
    return state;
  }

  isAbove100(state: DynamicRoutingState): boolean {
    return state.value > 100;
  }

  @Transition({ from: 'prepared', to: 'placeB' })
  async routeToPlaceB(ctx: WorkflowContext, state: DynamicRoutingState): Promise<DynamicRoutingState> {
    return state;
  } // no priority -> evaluated last, acts as fallback

  // --- Second routing fork (from 'placeA') ---

  @Transition({ from: 'placeA', to: 'placeC', priority: 10 })
  @Guard('isAbove200')
  async routeToPlaceC(ctx: WorkflowContext, state: DynamicRoutingState): Promise<DynamicRoutingState> {
    return state;
  }

  isAbove200(state: DynamicRoutingState): boolean {
    return state.value > 200;
  }

  @Transition({ from: 'placeA', to: 'placeD' })
  async routeToPlaceD(ctx: WorkflowContext, state: DynamicRoutingState): Promise<DynamicRoutingState> {
    return state;
  } // no priority -> evaluated last, acts as fallback

  // --- Terminal transitions ---

  @Final({ from: 'placeB' })
  async showMessagePlaceB(ctx: WorkflowContext, state: DynamicRoutingState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: 'Value is less or equal 100',
    });
    return {};
  }

  @Final({ from: 'placeC' })
  async showMessagePlaceC(ctx: WorkflowContext, state: DynamicRoutingState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: 'Value is greater than 200',
    });
    return {};
  }

  @Final({ from: 'placeD' })
  async showMessagePlaceD(ctx: WorkflowContext, state: DynamicRoutingState): Promise<unknown> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: 'Value is less or equal 200, but greater than 100',
    });
    return {};
  }
}
