#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { registerEnvCommand } from './commands/env.js';
import { registerListCommand } from './commands/list.js';
import { registerLoginCommand } from './commands/login.js';
import { handleError } from './errors.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

const program = new Command('loopstack')
  .description('Run, trace, and watch Loopstack workflows from the terminal')
  .version(version)
  .option('--env <name>', 'named environment from ~/.loopstack/config.json')
  .option('--url <url>', 'backend URL (overrides --env and the config file)')
  .option('--token <token>', 'API token (lsk_…); LOOPSTACK_TOKEN works too')
  .option('--json', 'machine-readable JSON output on stdout');

registerLoginCommand(program);
registerEnvCommand(program);
registerListCommand(program);

try {
  await program.parseAsync();
} catch (error) {
  handleError(error);
}
