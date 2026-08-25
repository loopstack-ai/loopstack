import pc from 'picocolors';
import type { CollectWidget } from '../types.js';
import { resolveTransitionId } from './transition.js';

interface SecretItem {
  key: string;
  hasValue: boolean;
}

/**
 * `secret-input`: the terminal counterpart of Studio's secret form. Values
 * are collected without echo, stored via the workspace secrets API on
 * confirm, and never enter the transition payload — the workflow only ever
 * learns "secrets are present" (Studio contract). Already-stored keys can be
 * kept by pressing enter; empty input on an unset key declines the prompt,
 * like every other widget. All writes happen after the confirm, so an abort
 * midway stores nothing.
 */
export const collectSecretInput: CollectWidget = async (ctx, io) => {
  const transitionId = resolveTransitionId(ctx);
  if (!transitionId || !ctx.http || !ctx.workspaceId) return undefined;

  const variables = Array.isArray(ctx.content.variables) ? (ctx.content.variables as { key?: unknown }[]) : [];
  const keys = variables.map((variable) => variable.key).filter((key): key is string => typeof key === 'string');

  const secretsPath = `/api/v1/workspaces/${ctx.workspaceId}/secrets`;
  const existing = new Set<string>();
  try {
    const secrets = await ctx.http.get<SecretItem[]>(secretsPath);
    for (const secret of secrets) if (secret.hasValue) existing.add(secret.key);
  } catch {
    // No hint available — every key behaves as unset.
  }

  io.out.write('\n');
  const updates: { key: string; value: string }[] = [];
  for (const key of keys) {
    const keep = existing.has(key) ? pc.dim(' (already set — enter to keep)') : '';
    const value = await io.askSecret(`${pc.bold(key)}${keep}: `);
    if (!value) {
      if (existing.has(key)) continue;
      return undefined;
    }
    updates.push({ key, value });
  }

  const label = (ctx.options?.label as string | undefined) ?? 'Save & Continue';
  io.out.write(`  ${pc.bold('1')}. ${label}\n`);
  const raw = (await io.ask(`${pc.bold('action:')} `)).trim();
  if (raw !== '1' && raw.toLowerCase() !== label.toLowerCase()) return undefined;

  try {
    for (const update of updates) {
      await ctx.http.put(`${secretsPath}/upsert`, update);
    }
  } catch (error) {
    io.out.write(pc.red(`✖ storing secrets failed: ${error instanceof Error ? error.message : String(error)}\n`));
    return undefined;
  }

  return { transitionId, payload: {} };
};
