import { spawnSync } from 'node:child_process';
import pc from 'picocolors';
import type { CollectWidget } from '../types.js';
import { resolveTransitionId } from './transition.js';

/**
 * `terminal-handoff`: a workflow parks with a local command to run in *this* terminal (e.g.
 * `docker exec -it … claude --continue`). We hand the TTY to it with `stdio: 'inherit'` — the terminal
 * becomes that process — and, when it exits, fire the widget's transition so the workflow can clean up
 * (e.g. tear the container down). Needs an interactive TTY; without one we just print the command.
 */
export const collectTerminalHandoff: CollectWidget = async (ctx, io) => {
  const transitionId = resolveTransitionId(ctx);
  if (!transitionId) return undefined;
  const command = typeof ctx.content.command === 'string' ? ctx.content.command : undefined;
  if (!command) return undefined;

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    io.out.write(pc.dim(`\n  Run this to continue interactively:\n    ${command}\n`));
    return undefined;
  }

  io.out.write(pc.dim('\n  Entering interactive session — this terminal is now that process. Exit it to continue.\n'));
  const result = spawnSync(command, { shell: true, stdio: 'inherit' });
  if (result.error) {
    io.out.write(pc.red(`  Could not start the session: ${result.error.message}\n`));
    return undefined;
  }
  // The session ended (any exit code) — fire the transition so the workflow tears the container down.
  return { transitionId, payload: {} };
};
