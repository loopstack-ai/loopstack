import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';

@Workflow({
  title: 'Prompt Input Chat',
  description:
    'Predefined-workflow HITL via the prompt-input widget. The workflow loops: it waits for a user ' +
    'message, echoes back a reply, and re-enters the waiting state. No LLM and no sub-workflow involved.',
  widget: __dirname + '/prompt-input-chat.workflow.yaml',
})
export class PromptInputChatWorkflow extends BaseWorkflow {
  @Transition({ to: 'waiting_for_user' })
  async greet(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: 'Hi! Send me a message and I will echo it back.',
    });
    return state;
  }

  @Transition({ from: 'waiting_for_user', to: 'reply_sent', wait: true, schema: z.string() })
  async userMessage(state: Record<string, unknown>, payload: string): Promise<Record<string, unknown>> {
    await this.documentStore.save(MessageDocument, { role: 'user', text: payload });
    await this.documentStore.save(MessageDocument, { role: 'assistant', text: `You said: ${payload}` });
    return state;
  }

  @Transition({ from: 'reply_sent', to: 'waiting_for_user' })
  async loop(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    return state;
  }
}
