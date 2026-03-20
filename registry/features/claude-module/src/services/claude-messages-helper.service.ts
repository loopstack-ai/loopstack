import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { DocumentEntity } from '@loopstack/common';

@Injectable()
export class ClaudeMessagesHelperService {
  private searchMessages(documents: DocumentEntity[], tag: string): Anthropic.MessageParam[] {
    return documents
      .filter((document) => !document.isInvalidated && document.tags?.includes(tag))
      .sort((a, b) => a.index - b.index)
      .flatMap((document) => {
        const content = document.content as {
          role: 'user' | 'assistant';
          content: string | Anthropic.ContentBlockParam[];
          toolResults?: Anthropic.ToolResultBlockParam[];
        };

        // Combined document: expand into assistant message + user tool_result message
        if (content.toolResults?.length) {
          return [
            { role: content.role, content: content.content } as Anthropic.MessageParam,
            { role: 'user' as const, content: content.toolResults } as Anthropic.MessageParam,
          ];
        }

        return [{ role: content.role, content: content.content } as Anthropic.MessageParam];
      });
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
