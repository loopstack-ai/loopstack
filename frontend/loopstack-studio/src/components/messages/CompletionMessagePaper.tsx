import React from 'react';
import { cn } from '../../lib/utils.ts';
import { Card } from '../ui/card';

interface CompletionMessagePaperProps {
  role?: 'system' | 'user' | 'assistant' | 'tool' | 'error' | 'document';
  children: React.ReactNode;
  timestamp?: Date;
  metadata?: Record<string, any>;
  fullWidth?: boolean;
  className?: string;
}

const CompletionMessagePaper: React.FC<CompletionMessagePaperProps> = ({
  role,
  children,
  timestamp,
  metadata,
  fullWidth = false,
  className
}) => {
  const roleConfig = {
    system: {
      color: '#efb108',
      align: 'left'
    },
    user: {
      color: '#0496d0',
      align: 'right'
    },
    assistant: {
      color: '#004a98',
      align: 'left'
    },
    document: {
      color: '#0e2135',
      align: 'left'
    },
    tool: {
      color: '#efb108',
      align: 'left'
    },
    error: {
      color: '#dc0d33',
      align: 'left'
    }
  };

  const config = (role ? roleConfig[role] : undefined) ?? roleConfig['assistant'];
  const isUser = role === 'user';

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className={cn(
        'mb-1 flex flex-row items-start animate-in fade-in duration-300',
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div
        className={cn(
          'min-w-[200px] flex flex-col',
          fullWidth ? 'w-full max-w-full' : 'max-w-[75%] w-auto',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div className="flex items-center mb-2 gap-2 opacity-70">
          {role ? <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: config.color }}
          >
            {role}
          </span> : ''}
          {timestamp && (
            <span className="text-xs text-muted-foreground font-mono">
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>

        {metadata && Object.keys(metadata).length > 0 && (
          <div
            className={cn(
              'bg-muted rounded-md p-2 mb-2 mFax-w-full',
              isUser ? 'self-end' : 'self-start'
            )}
          >
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="text-xs text-muted-foreground font-mono">
                <strong>{key}:</strong> {String(value)}
              </div>
            ))}
          </div>
        )}

        <Card
          className={cn(
            'relative px-5 py-3 max-w-full break-words shadow-none ',
            fullWidth ? 'w-full' : 'w-auto'
          )}
        >
          <div
            className={cn(
              'whitespace-pre-wrap break-words leading-relaxed',
              isUser ? 'user' : 'text-foreground'
            )}
          >
            <div className="message-content">{children}</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CompletionMessagePaper;
