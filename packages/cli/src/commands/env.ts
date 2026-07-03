import type { Command } from 'commander';
import pc from 'picocolors';
import { loadConfig, saveConfig } from '../config/config.js';
import { CliError } from '../errors.js';
import { printData, printStatus, renderTable } from '../output/format.js';

export function registerEnvCommand(program: Command): void {
  const env = program.command('env').description('Manage saved backend environments');

  env
    .command('list')
    .description('List saved environments')
    .action((_options, cmd) => {
      const config = loadConfig();
      const names = Object.keys(config.environments);
      const globals = cmd.optsWithGlobals() as { json?: boolean };

      if (globals.json) {
        printData(JSON.stringify(config, null, 2));
        return;
      }
      if (names.length === 0) {
        printStatus('No environments saved — run `loopstack login`.');
        return;
      }
      const rows = names.map((name) => [
        config.defaultEnvironment === name ? `${name} ${pc.dim('(default)')}` : name,
        config.environments[name].url,
        config.environments[name].token ? 'yes' : 'no',
      ]);
      printData(renderTable(['NAME', 'URL', 'TOKEN'], rows));
    });

  env
    .command('use <name>')
    .description('Set the default environment')
    .action((name: string) => {
      const config = loadConfig();
      if (!config.environments[name]) {
        throw new CliError(`Unknown environment "${name}" — run \`loopstack env list\`.`);
      }
      config.defaultEnvironment = name;
      saveConfig(config);
      printStatus(pc.green(`✔ Default environment is now "${name}".`));
    });
}
