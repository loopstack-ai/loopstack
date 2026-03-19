import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { DocumentEntity } from '@loopstack/common';

@Injectable()
export class ClaudeMessagesHelperService {
  private searchMessages(documents: DocumentEntity[], tag: string): Anthropic.MessageParam[] {
    return documents
      .filter((document) => !document.isInvalidated && document.tags?.includes(tag))
      .sort((a, b) => a.index - b.index)
      .map((document) => document.content as Anthropic.MessageParam);
  }

  getMessages(
    documents: DocumentEntity[],
    args: { messages?: Anthropic.MessageParam[]; messagesSearchTag?: string },
  ): Anthropic.MessageParam[] {
    let messages: Anthropic.MessageParam[] | undefined = args.messages;
    if (!messages?.length) {
      messages = this.searchMessages(documents, args.messagesSearchTag ?? 'message');
    }

    return messages;
  }
}
