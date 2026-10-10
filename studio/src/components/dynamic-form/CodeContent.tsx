import React from 'react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useTheme } from '@/providers/ThemeProvider.tsx';

const adaptedPrismDark: Record<string, Record<string, unknown>> = {
  'code[class*="language-"]': {
    color: '#e2e2e2',
    background: 'none',
    fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '1em',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: '4',
    hyphens: 'none',
  },
  'pre[class*="language-"]': {
    color: '#e2e2e2',
    fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '1em',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: '4',
    hyphens: 'none',
    padding: '1em',
    margin: '.5em 0',
    overflow: 'auto',
  },
  ':not(pre) > code[class*="language-"]': {
    padding: '.1em',
    borderRadius: '.3em',
    whiteSpace: 'normal',
  },
  comment: { color: '#7a7e85' },
  prolog: { color: '#7a7e85' },
  doctype: { color: '#7a7e85' },
  cdata: { color: '#7a7e85' },
  punctuation: { color: '#bcbec4' },
  namespace: { opacity: 0.7 },
  property: { color: '#56a8f5' },
  tag: { color: '#d5b778' },
  boolean: { color: '#c77dbb' },
  number: { color: '#2aacb8' },
  constant: { color: '#c77dbb' },
  symbol: { color: '#c77dbb' },
  deleted: { color: '#c77dbb' },
  selector: { color: '#6aab73' },
  'attr-name': { color: '#6aab73' },
  string: { color: '#6aab73' },
  char: { color: '#6aab73' },
  builtin: { color: '#6aab73' },
  inserted: { color: '#6aab73' },
  operator: { color: '#bcbec4', background: 'transparent' },
  entity: { color: '#bcbec4', background: 'transparent', cursor: 'help' },
  url: { color: '#bcbec4', background: 'transparent' },
  atrule: { color: '#cf8e6d' },
  'attr-value': { color: '#cf8e6d' },
  keyword: { color: '#cf8e6d' },
  function: { color: '#56a8f5' },
  'class-name': { color: '#c77dbb' },
  regex: { color: '#2aacb8' },
  important: { color: '#2aacb8', fontWeight: 'bold' },
  variable: { color: '#2aacb8' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
};

const adaptedPrismLight: Record<string, Record<string, unknown>> = {
  'code[class*="language-"]': {
    color: '#080808',
    background: 'none',
    fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '1em',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: '4',
    hyphens: 'none',
  },
  'pre[class*="language-"]': {
    color: '#080808',
    fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '1em',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: '4',
    hyphens: 'none',
    padding: '1em',
    margin: '.5em 0',
    overflow: 'auto',
  },
  ':not(pre) > code[class*="language-"]': {
    padding: '.1em',
    borderRadius: '.3em',
    whiteSpace: 'normal',
  },
  comment: { color: '#8c8c8c' },
  prolog: { color: '#8c8c8c' },
  doctype: { color: '#8c8c8c' },
  cdata: { color: '#8c8c8c' },
  punctuation: { color: '#080808' },
  namespace: { opacity: 0.7 },
  property: { color: '#00627a' },
  tag: { color: '#008077' },
  boolean: { color: '#871094' },
  number: { color: '#1750eb' },
  constant: { color: '#871094' },
  symbol: { color: '#871094' },
  deleted: { color: '#871094' },
  selector: { color: '#067d17' },
  'attr-name': { color: '#067d17' },
  string: { color: '#067d17' },
  char: { color: '#067d17' },
  builtin: { color: '#067d17' },
  inserted: { color: '#067d17' },
  operator: { color: '#080808', background: 'transparent' },
  entity: { color: '#080808', background: 'transparent', cursor: 'help' },
  url: { color: '#080808', background: 'transparent' },
  atrule: { color: '#0033b3' },
  'attr-value': { color: '#0033b3' },
  keyword: { color: '#0033b3' },
  function: { color: '#00627a' },
  'class-name': { color: '#871094' },
  regex: { color: '#1750eb' },
  important: { color: '#1750eb', fontWeight: 'bold' },
  variable: { color: '#1750eb' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
};

const CodeContent: React.FC<{ content: string }> = ({ content }) => {
  const { theme } = useTheme();
  const prismStyle = theme === 'dark' ? adaptedPrismDark : adaptedPrismLight;

  return (
    <Markdown
      components={{
        p({ children, ...props }) {
          return (
            <p className="p-4" {...props}>
              {children}
            </p>
          );
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className ?? '');
          const childrenString = Array.isArray(children)
            ? children.map((c) => (typeof c === 'string' ? c : String(c))).join('')
            : typeof children === 'string'
              ? children
              : '';
          const isBlock = childrenString.includes('\n');
          return match || isBlock ? (
            <>
              <SyntaxHighlighter
                // @ts-expect-error - Prism style objects have complex types that don't match the simplified type definition
                style={prismStyle}
                language={match?.[1] ?? 'text'}
                PreTag="div"
                {...(props as React.HTMLAttributes<HTMLElement>)}
              >
                {childrenString.replace(/\n$/, '')}
              </SyntaxHighlighter>
            </>
          ) : (
            <code className={className} {...(props as React.HTMLAttributes<HTMLElement>)}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </Markdown>
  );
};

export default CodeContent;
