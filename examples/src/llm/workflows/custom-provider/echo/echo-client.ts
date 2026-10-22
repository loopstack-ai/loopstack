import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

/** A message in the echo API format. */
export interface EchoMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** The native echo API response — what a real provider receives from its SDK. */
export interface EchoResponse {
  id: string;
  model: string;
  role: 'assistant';
  content: string;
  usage: { inputWords: number; outputWords: number };
}

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Stands in for the SDK client of a real LLM API. It answers with the last user message, so the
 * example runs without an API key or a model server.
 */
@Injectable()
export class EchoClient {
  async complete(request: { model: string; messages: EchoMessage[] }): Promise<EchoResponse> {
    const lastUserMessage = request.messages.filter((m) => m.role === 'user').at(-1);
    const content = `Echo: ${lastUserMessage?.content ?? ''}`;

    return {
      id: randomUUID(),
      model: request.model,
      role: 'assistant',
      content,
      usage: {
        inputWords: request.messages.reduce((sum, m) => sum + countWords(m.content), 0),
        outputWords: countWords(content),
      },
    };
  }
}
