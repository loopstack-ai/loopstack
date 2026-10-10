import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export type McpClientLike = Client;
export type McpTransportLike = Transport & { terminateSession?: () => Promise<void> };
