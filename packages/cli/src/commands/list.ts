import type { Command } from 'commander';
import pc from 'picocolors';
import type { LoopstackClient } from '@loopstack/client';
import type { StudioAppConfig, StudioWorkflowConfig } from '@loopstack/contracts/api';
import type { ResolvedConnection } from '../config/resolve.js';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { CliError } from '../errors.js';
import { printData, printStatus, renderTable } from '../output/format.js';

interface SchemaProperty {
  type?: string;
  description?: string;
  default?: unknown;
}

interface ObjectSchema {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

export function registerListCommand(program: Command): void {
  program
    .command('list [workflow]')
    .description('List the workflows you can run, or show one workflow’s arguments')
    .action(async (workflowName: string | undefined, _options: Record<string, never>, cmd) => {
      const globals = cmd.optsWithGlobals() as { env?: string; url?: string; token?: string; json?: boolean };
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);

      if (workflowName) {
        await describeWorkflow(client, workflowName, !!globals.json);
        return;
      }
      await listWorkflows(client, connection, !!globals.json);
    });
}

async function listWorkflows(client: LoopstackClient, connection: ResolvedConnection, json: boolean): Promise<void> {
  const apps = await client.config.apps();
  const workflows = apps.flatMap((app) =>
    app.workflows.map((workflow) => ({
      workflowName: workflow.workflowName,
      title: workflow.title ?? '',
      description: workflow.description ?? '',
      appName: app.appName,
      appTitle: app.title,
    })),
  );

  if (json) {
    printData(JSON.stringify(workflows, null, 2));
    return;
  }
  if (workflows.length === 0) {
    printStatus(`No workflows on ${connection.url} — is a Loopstack app with @StudioApp modules running?`);
    return;
  }
  const rows = workflows.map((workflow) => [workflow.workflowName, workflow.title, workflow.appTitle]);
  printData(renderTable(['WORKFLOW', 'TITLE', 'APP'], rows, [32, 42, 20]));
  printStatus('');
  printStatus(
    `${workflows.length} workflows in ${apps.length} apps (${connection.name}) — \`loopstack list <workflow>\` shows its arguments`,
  );
}

/** One workflow's card: description, arguments from its schema, a ready-to-run example. */
async function describeWorkflow(client: LoopstackClient, workflowName: string, json: boolean): Promise<void> {
  const apps = await client.config.apps();
  let app: StudioAppConfig | undefined;
  let workflow: StudioWorkflowConfig | undefined;
  for (const candidate of apps) {
    workflow = candidate.workflows.find((entry) => entry.workflowName === workflowName);
    if (workflow) {
      app = candidate;
      break;
    }
  }
  if (!workflow || !app) {
    const available = apps.flatMap((entry) => entry.workflows.map((item) => item.workflowName)).sort();
    throw new CliError(`Unknown workflow "${workflowName}". Available workflows: ${available.join(', ')}`);
  }

  const schema = (workflow.schema ?? {}) as ObjectSchema;
  const properties = schema.type === 'object' ? (schema.properties ?? {}) : {};
  const required = new Set(schema.required ?? []);

  if (json) {
    printData(
      JSON.stringify(
        {
          workflowName: workflow.workflowName,
          title: workflow.title,
          description: workflow.description,
          appName: app.appName,
          appTitle: app.title,
          schema: workflow.schema ?? null,
        },
        null,
        2,
      ),
    );
    return;
  }

  const title = workflow.title ? ` — ${workflow.title}` : '';
  printData(`${pc.bold(workflow.workflowName)}${title}`);
  if (workflow.description) printData(workflow.description);
  printData(pc.dim(`app: ${app.title} (${app.appName})`));
  printData('');

  const argNames = Object.keys(properties);
  if (argNames.length === 0) {
    printData(pc.dim('No arguments.'));
  } else {
    const rows = argNames.map((name) => {
      const property = properties[name];
      return [
        name,
        property.type ?? 'any',
        required.has(name) && property.default === undefined ? 'yes' : 'no',
        property.default !== undefined ? JSON.stringify(property.default) : '',
        property.description ?? '',
      ];
    });
    printData(renderTable(['ARGUMENT', 'TYPE', 'REQUIRED', 'DEFAULT', 'DESCRIPTION'], rows));
  }

  printData('');
  printData(`Run it:  ${pc.bold(exampleInvocation(workflow.workflowName, properties, required))}`);
}

/** A copy-pasteable `loopstack run` line with sample values for the arguments. */
function exampleInvocation(
  workflowName: string,
  properties: Record<string, SchemaProperty>,
  required: Set<string>,
): string {
  const sample = (property: SchemaProperty): string => {
    if (property.default !== undefined) return JSON.stringify(property.default);
    switch (property.type) {
      case 'number':
      case 'integer':
        return '42';
      case 'boolean':
        return 'true';
      default:
        return `<${property.type ?? 'value'}>`;
    }
  };
  const names = Object.keys(properties);
  const shown = names.filter((name) => required.has(name));
  const optional = names.filter((name) => !required.has(name));
  // With few arguments, show them all — the example doubles as usage.
  if (shown.length === 0 || names.length <= 3) shown.push(...optional.slice(0, 3 - shown.length));

  const args = shown.map((name) => `--arg ${name}=${sample(properties[name])}`).join(' ');
  return `loopstack run ${workflowName}${args ? ` ${args}` : ''}`;
}
