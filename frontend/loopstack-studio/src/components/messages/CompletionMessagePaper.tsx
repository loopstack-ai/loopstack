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
  className,
}) => {
  const roleConfig = {
    system: {
      color: '#efb108',
      align: 'left',
    },
    user: {
      color: '#0496d0',
      align: 'right',
    },
    assistant: {
      color: '#004a98',
      align: 'left',
    },
    document: {
      color: '#0e2135',
      align: 'left',
    },
    tool: {
      color: '#efb108',
      align: 'left',
    },
    error: {
      color: '#dc0d33',
      align: 'left',
    },
  };

  const config = (role ? roleConfig[role] : undefined) ?? roleConfig['assistant'];
  const isUser = role === 'user';

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'animate-in fade-in mb-1 flex flex-row items-start duration-300',
        isUser ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-w-[200px] flex-col',
          fullWidth ? 'w-full max-w-full' : 'w-auto max-w-[75%]',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        <div className="mb-2 flex items-center gap-2 opacity-70">
          {role ? (
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: config.color }}>
              {role}
            </span>
          ) : (
            ''
          )}
          {timestamp && <span className="text-muted-foreground font-mono text-xs">{formatTimestamp(timestamp)}</span>}
        </div>

        {metadata && Object.keys(metadata).length > 0 && (
          <div className={cn('bg-muted mFax-w-full mb-2 rounded-md p-2', isUser ? 'self-end' : 'self-start')}>
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="text-muted-foreground font-mono text-xs">
                <strong>{key}:</strong> {String(value)}
              </div>
            ))}
          </div>
        )}

        <Card className={cn('relative max-w-full px-5 py-3 break-words shadow-none', fullWidth ? 'w-full' : 'w-auto')}>
          <div className={cn('leading-relaxed break-words whitespace-pre-wrap', isUser ? 'user' : 'text-foreground')}>
            <div className="message-content">{children}</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CompletionMessagePaper;
