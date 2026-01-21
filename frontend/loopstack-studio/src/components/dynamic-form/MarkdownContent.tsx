import React from 'react';
import Markdown from 'react-markdown';
import 'katex/dist/katex.min.css';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { cn } from '../../lib/utils.ts';
import MermaidDiagram from './MermaidDiagram.tsx';
import './markdown.css';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className }) => {
  return (
    <div className={cn('markdown-content', className)}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: ({ children, className }) => {
            const isInline = !className;
            const language = className?.replace('language-', '') || '';

            if (language === 'mermaid' && typeof children === 'string') {
              return <MermaidDiagram chart={children} />;
            }

            return isInline ? <code>{children}</code> : <code className={className}>{children}</code>;
          },

          table: ({ children }) => (
            <div className="table-wrapper">
              <table>{children}</table>
            </div>
          ),

          div: ({ className, children, ...props }) => {
            if (className === 'math math-display') {
              return (
                <div className="math-display-wrapper">
                  <div className={cn('math math-display', className)} {...(props as any)}>
                    {children}
                  </div>
                </div>
              );
            }
            return (
              <div className={className} {...(props as any)}>
                {children}
              </div>
            );
          },

          span: ({ className, children, ...props }) => {
            if (className === 'math math-inline') {
              return (
                <span className={cn('math math-inline', className)} {...(props as any)}>
                  {children}
                </span>
              );
            }
            return (
              <span className={className} {...(props as any)}>
                {children}
              </span>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};

export default MarkdownContent;
