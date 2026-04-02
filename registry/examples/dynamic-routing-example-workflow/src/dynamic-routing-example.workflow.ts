import { z } from 'zod';
import { Final, Guard, Initial, InjectTool, Input, Transition, Workflow } from '@loopstack/common';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';

@Workflow({ uiConfig: __dirname + '/dynamic-routing-example.workflow.yaml' })
export class DynamicRoutingExampleWorkflow {
  @InjectTool() createChatMessage: CreateChatMessage;

  @Input({
    schema: z
      .object({
        value: z.number().default(150),
      })
      .strict(),
  })
  args: { value: number };

  // --- Initial transition ---

  @Initial({ to: 'prepared' })
  async createMockData() {
    await this.createChatMessage.run({
      role: 'assistant',
      content: `Analysing value = ${this.args.value}`,
    });
  }

  // --- First routing fork (from 'prepared') ---

  @Transition({ from: 'prepared', to: 'placeA', priority: 10 })
  @Guard('isAbove100')
  routeToPlaceA() {}

  isAbove100() {
    return this.args.value > 100;
  }

  @Transition({ from: 'prepared', to: 'placeB' })
  routeToPlaceB() {} // no priority → evaluated last, acts as fallback

  // --- Second routing fork (from 'placeA') ---

  @Transition({ from: 'placeA', to: 'placeC', priority: 10 })
  @Guard('isAbove200')
  routeToPlaceC() {}

  isAbove200() {
    return this.args.value > 200;
  }

  @Transition({ from: 'placeA', to: 'placeD' })
  routeToPlaceD() {} // no priority → evaluated last, acts as fallback

  // --- Terminal transitions ---

  @Final({ from: 'placeB' })
  async showMessagePlaceB() {
    await this.createChatMessage.run({
      role: 'assistant',
      content: 'Value is less or equal 100',
    });
  }

  @Final({ from: 'placeC' })
  async showMessagePlaceC() {
    await this.createChatMessage.run({
      role: 'assistant',
      content: 'Value is greater than 200',
    });
  }

  @Final({ from: 'placeD' })
  async showMessagePlaceD() {
    await this.createChatMessage.run({
      role: 'assistant',
      content: 'Value is less or equal 200, but greater than 100',
    });
  }
}
