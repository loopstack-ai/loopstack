import { Injectable } from '@nestjs/common';
import { ModelMessage } from '@ai-sdk/provider-utils';
import { DocumentEntity } from '@loopstack/common';

@Injectable()
export class AiMessagesHelperService {

  private searchMessages(documents: DocumentEntity[], tag: string): ModelMessage[] {
    return documents
      .filter((document) => document.tags?.includes(tag))
      .sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf())
      .map((document) => document.content);
  }

  getMessages(documents: DocumentEntity[], args: { messages?: ModelMessage[]; messagesSearchTag?: string; }): any[] {
    let messages: any = args.messages;
    if (!messages?.length) {
      messages = this.searchMessages(
        documents,
        args.messagesSearchTag ?? 'message',
      );
    }

    return messages;
  }
}