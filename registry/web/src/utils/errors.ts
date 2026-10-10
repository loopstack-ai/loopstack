export class InvalidUrlError extends Error {
  constructor(url: string, reason: string) {
    super(`Invalid URL "${url}": ${reason}`);
    this.name = 'InvalidUrlError';
  }
}

export class ContentTooLargeError extends Error {
  constructor(public readonly limitBytes: number) {
    super(`Response body exceeded ${limitBytes} bytes and was aborted.`);
    this.name = 'ContentTooLargeError';
  }
}

export class RedirectLimitExceededError extends Error {
  constructor(limit: number) {
    super(`Too many redirects (exceeded ${limit}).`);
    this.name = 'RedirectLimitExceededError';
  }
}

export class EgressBlockedError extends Error {
  constructor(public readonly domain: string) {
    super(`Access to ${domain} is blocked by the network egress proxy.`);
    this.name = 'EgressBlockedError';
  }
}

export class FetchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Fetch timed out after ${timeoutMs}ms.`);
    this.name = 'FetchTimeoutError';
  }
}
