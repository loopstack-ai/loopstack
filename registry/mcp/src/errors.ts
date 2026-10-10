/**
 * Base class for all MCP failures.
 * Catch this to handle any error raised while connecting to or calling a remote MCP server.
 *
 * @public
 */
export abstract class McpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Error thrown when an MCP URL fails the security checks (SSRF, allowlist, scheme, or userinfo violations).
 * Catch this to react to a rejected or unsafe target URL.
 *
 * @public
 */
export class McpUrlSecurityError extends McpError {}

/**
 * Error thrown when the remote MCP server responds with 401 or 403.
 * Catch this to handle missing or invalid authentication credentials.
 *
 * @public
 */
export class McpAuthError extends McpError {}

/**
 * Error thrown when an MCP call exceeds its configured `timeoutMs`.
 * Catch this to handle slow or unresponsive remote servers.
 *
 * @public
 */
export class McpTimeoutError extends McpError {}

/**
 * Error thrown when the MCP server returns a malformed response (JSON-RPC parse or invalid message).
 * Catch this to handle protocol-level violations from the remote server.
 *
 * @public
 */
export class McpProtocolError extends McpError {}

/**
 * Error thrown on transport-level failures (DNS, TCP, TLS, abort, or transport fallback).
 * Catch this to handle network or connection problems reaching the remote server.
 *
 * @public
 */
export class McpTransportError extends McpError {}
