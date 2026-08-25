import type { Command } from 'commander';
import { readFileSync } from 'node:fs';
import pc from 'picocolors';
import { createClientFor, resolveConnection } from '../config/resolve.js';
import { CliError, ExitCode } from '../errors.js';
import { inspectPendingPrompt } from '../hitl/pending.js';
import { printData, printStatus } from '../output/format.js';
import { parseRunArgs } from '../run/args.js';

interface AnswerOptions {
  arg: string[];
  payload?: string;
  transition?: string;
}

interface Globals {
  env?: string;
  url?: string;
  token?: string;
  json?: boolean;
}

const collect = (value: string, previous: string[]) => [...previous, value];

export function registerAnswerCommand(program: Command): void {
  program
    .command('answer <runId>')
    .description('Answer the prompt a waiting run is parked on — non-interactive (for agents and scripts)')
    .option('--arg <key=value>', 'answer field (repeatable); key=@file reads a file, key=@- reads stdin', collect, [])
    .option('--payload <json>', 'full answer payload as JSON; @file reads a file, @- reads stdin')
    .option('--transition <id>', 'wait transition to answer (required when several are available)')
    .action(async (runId: string, options: AnswerOptions, cmd) => {
      const globals = cmd.optsWithGlobals() as Globals;
      const connection = resolveConnection(globals);
      const client = createClientFor(connection);
      const json = !!globals.json;

      const pending = await inspectPendingPrompt(client, runId);
      if (!pending) {
        throw new CliError(`Run ${runId} has no pending prompt — nothing to answer.`);
      }
      if (pending.studioOnly) {
        throw new CliError(
          `The pending input (${pending.widget}) can only be collected in Studio — the CLI cannot answer it.`,
        );
      }

      const transition = options.transition ?? pending.transition;
      if (!transition) {
        throw new CliError(
          `Several transitions are available (${pending.transitions.join(', ')}) — pick one with --transition <id>.`,
        );
      }
      if (!pending.transitions.includes(transition)) {
        throw new CliError(
          `Transition '${transition}' is not available — currently available: ${pending.transitions.join(', ')}.`,
        );
      }

      const payload = buildPayload(options);

      // Submitted against the prompting workflow itself — for sub-workflow prompts the
      // completion propagates to the root via the parent's callback transition.
      await client.processor.run(pending.workflowId, {
        transition: { id: transition, workflowId: pending.workflowId, payload },
      });

      if (json) {
        printData(
          JSON.stringify(
            { runId, promptWorkflowId: pending.workflowId, transition, payload, submitted: true },
            null,
            2,
          ),
        );
      } else {
        printStatus(`${pc.green('✓')} answered '${transition}' on ${pending.workflowName}`);
        printStatus(pc.dim(`  follow with: loopstack attach ${runId}`));
      }
      process.exit(ExitCode.Success);
    });
}

/** `--payload` (JSON, @file, @-) wins; otherwise repeated `--arg` pairs; `{}` when neither is given. */
function buildPayload(options: AnswerOptions): Record<string, unknown> {
  if (options.payload !== undefined && options.arg.length > 0) {
    throw new CliError('Use either --payload or --arg, not both.');
  }
  if (options.payload !== undefined) {
    const raw =
      options.payload === '@-'
        ? readFileSync(0, 'utf8')
        : options.payload.startsWith('@')
          ? readPayloadFile(options.payload.slice(1))
          : options.payload;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new CliError('--payload must be a JSON object.');
      }
      return parsed as Record<string, unknown>;
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new CliError(`--payload is not valid JSON: ${raw.slice(0, 120)}`);
    }
  }
  return parseRunArgs(options.arg);
}

function readPayloadFile(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    throw new CliError(`Cannot read --payload file "${path}".`);
  }
}
