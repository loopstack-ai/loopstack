import React from 'react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

const adaptedPrism: Record<string, Record<string, unknown>> = {
  'code[class*="language-"]': {
    color: 'black',
    background: 'none',
    textShadow: '0 1px white',
    fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '1em',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    MozTabSize: '4',
    OTabSize: '4',
    tabSize: '4',
    WebkitHyphens: 'none',
    MozHyphens: 'none',
    msHyphens: 'none',
    hyphens: 'none',
  },
  'pre[class*="language-"]': {
    color: 'black',
    // "background": "#f5f2f0",
    textShadow: '0 1px white',
    fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    fontSize: '1em',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    MozTabSize: '4',
    OTabSize: '4',
    tabSize: '4',
    WebkitHyphens: 'none',
    MozHyphens: 'none',
    msHyphens: 'none',
    hyphens: 'none',
    padding: '1em',
    margin: '.5em 0',
    overflow: 'auto',
  },
  'pre[class*="language-"]::-moz-selection': {
    textShadow: 'none',
    background: '#b3d4fc',
  },
  'pre[class*="language-"] ::-moz-selection': {
    textShadow: 'none',
    background: '#b3d4fc',
  },
  'code[class*="language-"]::-moz-selection': {
    textShadow: 'none',
    background: '#b3d4fc',
  },
  'code[class*="language-"] ::-moz-selection': {
    textShadow: 'none',
    background: '#b3d4fc',
  },
  'pre[class*="language-"]::selection': {
    textShadow: 'none',
    background: '#b3d4fc',
  },
  'pre[class*="language-"] ::selection': {
    textShadow: 'none',
    background: '#b3d4fc',
  },
  'code[class*="language-"]::selection': {
    textShadow: 'none',
    background: '#b3d4fc',
  },
  'code[class*="language-"] ::selection': {
    textShadow: 'none',
    background: '#b3d4fc',
  },
  ':not(pre) > code[class*="language-"]': {
    // "background": "#f5f2f0",
    padding: '.1em',
    borderRadius: '.3em',
    whiteSpace: 'normal',
  },
  comment: {
    color: 'slategray',
  },
  prolog: {
    color: 'slategray',
  },
  doctype: {
    color: 'slategray',
  },
  cdata: {
    color: 'slategray',
  },
  punctuation: {
    color: '#999',
  },
  namespace: {
    opacity: 0.7,
  },
  property: {
    color: '#905',
  },
  tag: {
    color: '#905',
  },
  boolean: {
    color: '#905',
  },
  number: {
    color: '#905',
  },
  constant: {
    color: '#905',
  },
  symbol: {
    color: '#905',
  },
  deleted: {
    color: '#905',
  },
  selector: {
    color: '#690',
  },
  'attr-name': {
    color: '#690',
  },
  string: {
    color: '#690',
  },
  char: {
    color: '#690',
  },
  builtin: {
    color: '#690',
  },
  inserted: {
    color: '#690',
  },
  operator: {
    color: '#9a6e3a',
    background: 'hsla(0, 0%, 100%, .5)',
  },
  entity: {
    color: '#9a6e3a',
    background: 'hsla(0, 0%, 100%, .5)',
    cursor: 'help',
  },
  url: {
    color: '#9a6e3a',
    background: 'hsla(0, 0%, 100%, .5)',
  },
  '.language-css .token.string': {
    color: '#9a6e3a',
    background: 'hsla(0, 0%, 100%, .5)',
  },
  '.style .token.string': {
    color: '#9a6e3a',
    background: 'hsla(0, 0%, 100%, .5)',
  },
  atrule: {
    color: '#07a',
  },
  'attr-value': {
    color: '#07a',
  },
  keyword: {
    color: '#07a',
  },
  function: {
    color: '#DD4A68',
  },
  'class-name': {
    color: '#DD4A68',
  },
  regex: {
    color: '#e90',
  },
  important: {
    color: '#e90',
    fontWeight: 'bold',
  },
  variable: {
    color: '#e90',
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
};

const CodeContent: React.FC<{ content: string }> = ({ content }) => {
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
          return match ? (
            <>
              <SyntaxHighlighter
                // @ts-expect-error - Prism style objects have complex types that don't match the simplified type definition
                style={adaptedPrism}
                language={match[1]}
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
