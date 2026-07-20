import type { Command } from 'commander';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import pc from 'picocolors';
import { createClient } from '@loopstack/client';
import { configPath, loadConfig, saveConfig } from '../config/config.js';
import { CliError } from '../errors.js';
import { printStatus } from '../output/format.js';

function suggestName(url: string): string {
  const hostname = new URL(url).hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' ? 'local' : hostname;
}

export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Save a backend environment to ~/.loopstack/config.json (pass --url/--token or answer the prompts)')
    .option('--name <name>', 'environment name')
    .option('--studio-url <url>', 'Studio frontend URL — enables deep links in run output')
    .action(async (_options: { name?: string; studioUrl?: string }, cmd) => {
      const merged = cmd.optsWithGlobals() as { url?: string; token?: string; name?: string; studioUrl?: string };
      let { url, token, name, studioUrl } = merged;
      // An empty --token/--studio-url means "none", not the empty string.
      token = token || undefined;
      studioUrl = studioUrl || undefined;

      if (!url && !stdin.isTTY) {
        throw new CliError('Non-interactive shell — pass --url (and --token for authenticated backends).');
      }

      if (!url || (token === undefined && stdin.isTTY)) {
        const rl = createInterface({ input: stdin, output: stdout });
        try {
          if (!url) {
            url = (await rl.question('Backend URL [http://localhost:3000]: ')).trim() || 'http://localhost:3000';
          }
          if (token === undefined) {
            token = (await rl.question('API token (lsk_…, empty for local no-auth): ')).trim() || undefined;
          }
          if (studioUrl === undefined) {
            const isLocal = ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
            const suggestion = isLocal ? 'http://localhost:5173' : '';
            const hint = suggestion ? ` [${suggestion}]` : ' (empty for none)';
            studioUrl = (await rl.question(`Studio URL${hint}: `)).trim() || suggestion || undefined;
          }
          if (!name) {
            const suggested = suggestName(url);
            name = (await rl.question(`Environment name [${suggested}]: `)).trim() || suggested;
          }
        } finally {
          rl.close();
        }
      }
      name ??= suggestName(url);

      printStatus(pc.dim(`Probing ${url} …`));
      const client = createClient({ url, token, envKey: name });
      await client.workflows.list({ limit: 1 });

      const config = loadConfig();
      config.environments[name] = { ...config.environments[name], url, token, ...(studioUrl && { studioUrl }) };
      config.defaultEnvironment ??= name;
      saveConfig(config);

      const isDefault = config.defaultEnvironment === name;
      printStatus(pc.green(`✔ Environment "${name}" saved to ${configPath()}${isDefault ? ' (default)' : ''}.`));
    });
}
