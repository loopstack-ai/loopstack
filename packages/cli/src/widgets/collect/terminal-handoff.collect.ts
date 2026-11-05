import { spawnSync } from 'node:child_process';
import pc from 'picocolors';
import type { CollectWidget } from '../types.js';
import { resolveTransitionId } from './transition.js';

/**
 * `terminal-handoff`: a workflow parks with a local command to run in *this* terminal (e.g.
 * `docker exec -it … bash`). We hand the TTY to it with `stdio: 'inherit'` — the terminal becomes that
 * process — and, when it exits, fire the widget's transition so the workflow can continue (e.g. tear a
 * container down). The content's `title` heads the notice. Needs an interactive TTY; without one we just
 * print the command.
 */
export const collectTerminalHandoff: CollectWidget = async (ctx, io) => {
  const transitionId = resolveTransitionId(ctx);
  if (!transitionId) return undefined;
  const command = typeof ctx.content.command === 'string' ? ctx.content.command : undefined;
  if (!command) return undefined;
  const heading = typeof ctx.content.title === 'string' ? ctx.content.title : 'Terminal hand-off';

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    io.out.write(pc.dim(`\n  ${heading} — run this in a terminal to continue:\n    ${command}\n`));
    return undefined;
  }

  io.out.write(pc.dim(`\n  ${heading} — this terminal now runs the command. Exit it to continue the run.\n`));
  const result = spawnSync(command, { shell: true, stdio: 'inherit' });
  if (result.error) {
    io.out.write(pc.red(`  Could not start the command: ${result.error.message}\n`));
    return undefined;
  }
  // The command ended (any exit code) — fire the transition so the workflow continues.
  return { transitionId, payload: {} };
};
