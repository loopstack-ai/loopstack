import { describe, expect, it } from 'vitest';
import { PREAPPROVED_HOSTS, isPreapprovedHost, isPreapprovedUrl } from '../preapproved-hosts.js';

describe('isPreapprovedHost', () => {
  it.each([...PREAPPROVED_HOSTS])('accepts the listed host %s on any path', (host) => {
    expect(isPreapprovedHost(host, '/')).toBe(true);
    expect(isPreapprovedHost(host, '/any/deep/path')).toBe(true);
  });

  it('rejects hosts that are not listed', () => {
    expect(isPreapprovedHost('example.com', '/')).toBe(false);
  });

  it('matches hostnames exactly without subdomain or suffix expansion', () => {
    expect(isPreapprovedHost('evil.nodejs.org', '/')).toBe(false);
    expect(isPreapprovedHost('nodejs.org.example.com', '/')).toBe(false);
    expect(isPreapprovedHost('typescriptlang.org', '/')).toBe(false);
  });
});

describe('isPreapprovedUrl', () => {
  it('accepts URLs on a listed host', () => {
    expect(isPreapprovedUrl('https://docs.nestjs.com/providers')).toBe(true);
    expect(isPreapprovedUrl('http://nodejs.org/api/fs.html?x=1')).toBe(true);
  });

  it('normalizes the hostname case via URL parsing', () => {
    expect(isPreapprovedUrl('https://NodeJS.org/en')).toBe(true);
  });

  it('rejects URLs on other hosts', () => {
    expect(isPreapprovedUrl('https://example.com/nodejs.org')).toBe(false);
    expect(isPreapprovedUrl('https://nodejs.org.example.com/')).toBe(false);
  });

  it('returns false for unparseable input', () => {
    expect(isPreapprovedUrl('not a url')).toBe(false);
  });
});
