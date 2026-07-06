import { describe, expect, it } from 'vitest';
import { createSseParser } from './sse-parser.js';
import type { SseFrame } from './sse-parser.js';

function parse(chunks: string[]): SseFrame[] {
  const frames: SseFrame[] = [];
  const parser = createSseParser((frame) => frames.push(frame));
  for (const chunk of chunks) parser.feed(chunk);
  return frames;
}

describe('createSseParser', () => {
  it('parses a complete frame', () => {
    expect(parse(['id: 1\ndata: {"a":1}\n\n'])).toEqual([{ id: '1', event: undefined, data: '{"a":1}' }]);
  });

  it('handles frames split across arbitrary chunk boundaries', () => {
    expect(parse(['id: ', '42\nda', 'ta: hel', 'lo\n', '\n'])).toEqual([{ id: '42', event: undefined, data: 'hello' }]);
  });

  it('joins multiple data lines with newlines', () => {
    expect(parse(['data: line1\ndata: line2\n\n'])[0].data).toBe('line1\nline2');
  });

  it('parses named events', () => {
    expect(parse(['event: ping\nid: 7\ndata: ping\n\n'])).toEqual([{ id: '7', event: 'ping', data: 'ping' }]);
  });

  it('ignores comment lines', () => {
    expect(parse([': heartbeat\n\ndata: x\n\n'])).toEqual([{ id: undefined, event: undefined, data: 'x' }]);
  });

  it('handles CRLF and lone-CR line endings, including a CR split across chunks', () => {
    expect(parse(['data: a\r\n\r\n'])).toEqual([{ id: undefined, event: undefined, data: 'a' }]);
    // A trailing CR is deferred until the next chunk shows it is not a CRLF.
    expect(parse(['data: b\r\r', ': resolved\n'])).toEqual([{ id: undefined, event: undefined, data: 'b' }]);
    expect(parse(['data: c\r', '\n\r\n'])).toEqual([{ id: undefined, event: undefined, data: 'c' }]);
  });

  it('treats a value without a leading space correctly', () => {
    expect(parse(['data:tight\n\n'])[0].data).toBe('tight');
  });

  it('emits multiple frames from one chunk', () => {
    const frames = parse(['id: 1\ndata: a\n\nid: 2\ndata: b\n\n']);
    expect(frames.map((f) => f.id)).toEqual(['1', '2']);
  });

  it('does not emit an unterminated trailing frame', () => {
    expect(parse(['data: pending\n'])).toEqual([]);
  });
});
