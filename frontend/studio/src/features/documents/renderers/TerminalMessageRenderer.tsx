import React, { useEffect, useMemo, useRef } from 'react';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { parseAnsi } from './ansi.ts';

type TerminalContentType = {
  text: string;
  title?: string;
};

interface TerminalMessageRendererProps {
  document: Omit<DocumentItemInterface, 'content'> & { content: TerminalContentType };
}

/**
 * Renders {@link TerminalDocument} output as a dark, monospaced terminal card. ANSI color escapes in the
 * stream (NestJS logs, npm/tsx, git, …) are parsed into colored spans; the view keeps itself scrolled to
 * the newest line so a live log tails naturally.
 */
const TerminalMessageRenderer: React.FC<TerminalMessageRendererProps> = ({ document }) => {
  const { text, title } = document.content;
  const tokens = useMemo(() => parseAnsi(text ?? ''), [text]);
  const bodyRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-black/30 bg-[#1e1e1e] shadow-sm">
      {title && (
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </span>
          <span className="font-mono text-xs text-white/60">{title}</span>
        </div>
      )}
      <pre
        ref={bodyRef}
        className="max-h-96 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#d4d4d4]"
      >
        {tokens.map((token, i) => (
          <span key={i} style={token.style}>
            {token.text}
          </span>
        ))}
      </pre>
    </div>
  );
};

export default TerminalMessageRenderer;
