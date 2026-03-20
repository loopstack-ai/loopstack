import { CopyIcon } from 'lucide-react';
import { Fragment } from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message.tsx';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning.tsx';
import type { ToolHeaderProps } from '@/components/ai-elements/tool.tsx';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool.tsx';

// Anthropic native content block types
interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

type ContentBlock = TextBlock | ToolUseBlock | ThinkingBlock | ToolResultBlock;

interface ClaudeMessageData {
  id?: string;
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  toolResults?: ToolResultBlock[];
  stop_reason?: string;
}

const ClaudeMessage = ({ document }: { document: DocumentItemInterface; isLastItem: boolean }) => {
  const message = document.content as ClaudeMessageData;
  const messageId = message.id ?? document.id;

  // Build a lookup from tool_use_id → tool result for combined documents
  const toolResultMap = new Map<string, ToolResultBlock>();
  if (message.toolResults) {
    for (const result of message.toolResults) {
      toolResultMap.set(result.tool_use_id, result);
    }
  }

  // String content — simple text message
  if (typeof message.content === 'string') {
    return (
      <Message from={message.role}>
        <MessageContent>
          <MessageResponse>{message.content}</MessageResponse>
        </MessageContent>
        {message.role === 'assistant' && (
          <MessageActions>
            <MessageAction onClick={() => void navigator.clipboard.writeText(message.content as string)} label="Copy">
              <CopyIcon className="size-3" />
            </MessageAction>
          </MessageActions>
        )}
      </Message>
    );
  }

  // Array content — iterate over ContentBlocks
  const blocks = message.content;

  return (
    <Fragment>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'text':
            return (
              <Message key={`${messageId}-${i}`} from={message.role}>
                <MessageContent>
                  <MessageResponse>{block.text}</MessageResponse>
                </MessageContent>
                {message.role === 'assistant' && (
                  <MessageActions>
                    <MessageAction onClick={() => void navigator.clipboard.writeText(block.text)} label="Copy">
                      <CopyIcon className="size-3" />
                    </MessageAction>
                  </MessageActions>
                )}
              </Message>
            );

          case 'thinking':
            return (
              <Reasoning key={`${messageId}-${i}`} className="w-full" isStreaming={false}>
                <ReasoningTrigger />
                <ReasoningContent>{block.thinking}</ReasoningContent>
              </Reasoning>
            );

          case 'tool_use': {
            const result = toolResultMap.get(block.id);
            let parsedOutput: unknown;
            if (result) {
              try {
                parsedOutput = JSON.parse(result.content);
              } catch {
                parsedOutput = result.content;
              }
            }
            const toolUseState: ToolHeaderProps['state'] = result
              ? result.is_error
                ? 'output-error'
                : 'output-available'
              : 'input-available';
            const toolUseType: ToolHeaderProps['type'] = 'tool-call';
            return (
              <Message key={`${messageId}-${i}`} from="assistant">
                <Tool>
                  <ToolHeader state={toolUseState} title={block.name} type={toolUseType} />
                  <ToolContent>
                    <ToolInput input={block.input} />
                    {result && <ToolOutput output={parsedOutput} errorText={result.is_error ? result.content : ''} />}
                  </ToolContent>
                </Tool>
              </Message>
            );
          }

          case 'tool_result': {
            // Standalone tool_result blocks (not part of a combined document)
            // Skip if this result was already rendered alongside its tool_use block
            if (toolResultMap.size > 0) return null;
            let parsedOutput: unknown;
            try {
              parsedOutput = JSON.parse(block.content);
            } catch {
              parsedOutput = block.content;
            }
            const toolResultState: ToolHeaderProps['state'] = block.is_error ? 'output-error' : 'output-available';
            const toolResultType: ToolHeaderProps['type'] = 'tool-result';
            return (
              <Message key={`${messageId}-${i}`} from="assistant">
                <Tool>
                  <ToolHeader state={toolResultState} title="Tool Result" type={toolResultType} />
                  <ToolContent>
                    <ToolOutput output={parsedOutput} errorText={block.is_error ? block.content : ''} />
                  </ToolContent>
                </Tool>
              </Message>
            );
          }

          default:
            return null;
        }
      })}
    </Fragment>
  );
};

export default ClaudeMessage;
