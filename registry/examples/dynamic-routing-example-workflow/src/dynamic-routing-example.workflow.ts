import { z } from 'zod';
import { BaseWorkflow, Final, Guard, Initial, MessageDocument, Transition, Workflow } from '@loopstack/common';

@Workflow({
  uiConfig: __dirname + '/dynamic-routing-example.ui.yaml',
  schema: z
    .object({
      value: z.number().default(150),
    })
    .strict(),
})
export class DynamicRoutingExampleWorkflow extends BaseWorkflow<{ value: number }> {
  value!: number;

  // --- Initial transition ---

  @Initial({ to: 'prepared' })
  async createMockData(args: { value: number }) {
    this.value = args.value;
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: `Analysing value = ${this.value}`,
    });
  }

  // --- First routing fork (from 'prepared') ---

  @Transition({ from: 'prepared', to: 'placeA', priority: 10 })
  @Guard('isAbove100')
  routeToPlaceA() {}

  isAbove100() {
    return this.value > 100;
  }

  @Transition({ from: 'prepared', to: 'placeB' })
  routeToPlaceB() {} // no priority → evaluated last, acts as fallback

  // --- Second routing fork (from 'placeA') ---

  @Transition({ from: 'placeA', to: 'placeC', priority: 10 })
  @Guard('isAbove200')
  routeToPlaceC() {}

  isAbove200() {
    return this.value > 200;
  }

  @Transition({ from: 'placeA', to: 'placeD' })
  routeToPlaceD() {} // no priority → evaluated last, acts as fallback

  // --- Terminal transitions ---

  @Final({ from: 'placeB' })
  async showMessagePlaceB() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: 'Value is less or equal 100',
    });
  }

  @Final({ from: 'placeC' })
  async showMessagePlaceC() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: 'Value is greater than 200',
    });
  }

  @Final({ from: 'placeD' })
  async showMessagePlaceD() {
    await this.repository.save(MessageDocument, {
      role: 'assistant',
      content: 'Value is less or equal 200, but greater than 100',
    });
  }
}
