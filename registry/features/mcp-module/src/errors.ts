export abstract class McpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class McpUrlSecurityError extends McpError {}

export class McpAuthError extends McpError {}
export class McpTimeoutError extends McpError {}
export class McpProtocolError extends McpError {}

export class McpTransportError extends McpError {}
