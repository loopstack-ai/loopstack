import { describe, expect, it } from 'vitest';
import {
  ContentTooLargeError,
  EgressBlockedError,
  FetchTimeoutError,
  InvalidUrlError,
  RedirectLimitExceededError,
} from '../errors.js';

describe('web fetch errors', () => {
  it('InvalidUrlError names the URL and the reason', () => {
    const error = new InvalidUrlError('ftp://example.com', 'unsupported protocol');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvalidUrlError');
    expect(error.message).toBe('Invalid URL "ftp://example.com": unsupported protocol');
  });

  it('ContentTooLargeError exposes the limit', () => {
    const error = new ContentTooLargeError(1024);

    expect(error.name).toBe('ContentTooLargeError');
    expect(error.limitBytes).toBe(1024);
    expect(error.message).toBe('Response body exceeded 1024 bytes and was aborted.');
  });

  it('RedirectLimitExceededError names the limit', () => {
    const error = new RedirectLimitExceededError(10);

    expect(error.name).toBe('RedirectLimitExceededError');
    expect(error.message).toBe('Too many redirects (exceeded 10).');
  });

  it('EgressBlockedError exposes the blocked domain', () => {
    const error = new EgressBlockedError('example.com');

    expect(error.name).toBe('EgressBlockedError');
    expect(error.domain).toBe('example.com');
    expect(error.message).toBe('Access to example.com is blocked by the network egress proxy.');
  });

  it('FetchTimeoutError names the timeout', () => {
    const error = new FetchTimeoutError(60_000);

    expect(error.name).toBe('FetchTimeoutError');
    expect(error.message).toBe('Fetch timed out after 60000ms.');
  });
});
