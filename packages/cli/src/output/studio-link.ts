import { spawn } from 'node:child_process';
import type { ResolvedConnection } from '../config/resolve.js';

/** Canonical Studio deep link for a run, or undefined when no Studio URL is known. */
export function studioRunUrl(connection: ResolvedConnection, workflowId: string): string | undefined {
  if (!connection.studioUrl) return undefined;
  return `${connection.studioUrl.replace(/\/+$/, '')}/workflows/${workflowId}`;
}

/** Fire-and-forget browser open; failures are silent — the printed URL is the fallback. */
export function openInBrowser(url: string): void {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]];
  spawn(command as string, args as string[], { detached: true, stdio: 'ignore' })
    .on('error', () => {})
    .unref();
}
