import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export type McpClientLike = Client;
export type McpTransportLike = Transport & { terminateSession?: () => Promise<void> };

export type McpClientCtor = new (
  info: { name: string; version: string },
  options?: Record<string, unknown>,
) => McpClientLike;

export type McpTransportCtor = new (url: URL, options?: { requestInit?: RequestInit }) => McpTransportLike;
