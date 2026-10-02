import { z } from 'zod';

const LINE_BREAK = /[\r\n]/;

/** A string that can be written into a single MIME header line. */
export const headerValue = z.string().refine((value) => !LINE_BREAK.test(value), {
  message: 'Header values must not contain line breaks',
});

/** Replaces every run of CR/LF with a single space, so the value stays on one header line. */
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ');
}

// 45 source bytes encode to 60 base64 chars, which keeps each encoded-word within RFC 2047's 75-char limit.
const MAX_ENCODED_WORD_BYTES = 45;

/**
 * Encodes unstructured header text (such as a subject) as RFC 2047 UTF-8 encoded-words when it contains
 * non-ASCII characters. ASCII text is returned unchanged.
 */
export function encodeHeaderText(value: string): string {
  if (/^[\x20-\x7e\t]*$/.test(value)) return value;

  const words: string[] = [];
  let chunk = '';
  for (const char of value) {
    if (Buffer.byteLength(chunk + char) > MAX_ENCODED_WORD_BYTES) {
      words.push(chunk);
      chunk = '';
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);

  return words.map((word) => `=?UTF-8?B?${Buffer.from(word).toString('base64')}?=`).join('\r\n ');
}
