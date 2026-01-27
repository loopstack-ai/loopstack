import { Injectable } from '@nestjs/common';
import { UIDataTypes, UIMessage, UITools } from 'ai';
import { DocumentEntity } from '@loopstack/common';

@Injectable()
export class AiMessagesHelperService {
  private searchMessages(
    documents: DocumentEntity[],
    tag: string,
  ): Omit<UIMessage<unknown, UIDataTypes, UITools>, 'id'>[] {
    return documents
      .filter((document) => document.tags?.includes(tag))
      .sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf())
      .map((document) => document.content as Omit<UIMessage<unknown, UIDataTypes, UITools>, 'id'>);
  }

  getMessages(
    documents: DocumentEntity[],
    args: { messages?: Omit<UIMessage<unknown, UIDataTypes, UITools>, 'id'>[]; messagesSearchTag?: string },
  ): Omit<UIMessage<unknown, UIDataTypes, UITools>, 'id'>[] {
    let messages: Omit<UIMessage<unknown, UIDataTypes, UITools>, 'id'>[] | undefined = args.messages;
    if (!messages?.length) {
      messages = this.searchMessages(documents, args.messagesSearchTag ?? 'message');
    }

    return messages;
  }
}
