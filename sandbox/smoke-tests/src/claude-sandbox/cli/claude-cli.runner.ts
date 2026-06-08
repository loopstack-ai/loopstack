import { Injectable } from '@nestjs/common';
import { RemoteClient } from '@loopstack/remote-client';
import { ClaudeRunStats } from './claude-cli.types';
import { ClaudeStreamParser } from './claude-stream.parser';

const PROMPT_FILE = '.claude-prompt.txt';
const RUN_SCRIPT_FILE = 'run-claude.sh';
const OUT_FILE = '.claude-job.out';
const ERR_FILE = '.claude-job.err';
const EXIT_FILE = '.claude-job.exit';

export interface ClaudeLaunchOptions {
  /** Resume a previous session (keeps full context across runs). */
  resumeSessionId?: string;
}

/**
 * Runs Claude Code headlessly inside a sandbox via the remote agent: writes the prompt and a launch
 * script, fires it with `nohup`, then exposes polling/reading helpers. Output uses `stream-json`, so
 * progress can be rendered live while the job runs (see {@link ClaudeStreamParser}).
 */
@Injectable()
export class ClaudeCliRunner {
  constructor(
    private readonly remote: RemoteClient,
    private readonly parser: ClaudeStreamParser,
  ) {}

  async launch(agentUrl: string, prompt: string, options: ClaudeLaunchOptions = {}): Promise<void> {
    await this.remote.writeFile(agentUrl, PROMPT_FILE, prompt);
    await this.remote.writeFile(agentUrl, RUN_SCRIPT_FILE, this.runScript(options.resumeSessionId));
    await this.remote.executeCommand(
      agentUrl,
      `chmod +x ${RUN_SCRIPT_FILE} && nohup ./${RUN_SCRIPT_FILE} >/dev/null 2>&1 & echo launched`,
    );
  }

  /** True once the launched job has written its exit-code file. */
  async isFinished(agentUrl: string): Promise<boolean> {
    const result = await this.remote.executeCommand(agentUrl, `cat ${EXIT_FILE} 2>/dev/null || echo RUNNING`);
    const value = result.stdout.trim();
    return value !== '' && value !== 'RUNNING';
  }

  async readExitCode(agentUrl: string): Promise<number> {
    const result = await this.remote.executeCommand(agentUrl, `cat ${EXIT_FILE} 2>/dev/null || echo 1`);
    return parseInt(result.stdout.trim(), 10) || 0;
  }

  async readStats(agentUrl: string): Promise<ClaudeRunStats> {
    return this.parser.parseStats(await this.readOutput(agentUrl));
  }

  async readErrorLog(agentUrl: string): Promise<string> {
    const err = await this.remote.readFile(agentUrl, ERR_FILE).catch(() => ({ content: '' }));
    return err.content;
  }

  /** Live transcript markdown for the current output, or '' when nothing renderable yet. */
  async readTranscript(agentUrl: string, heading: string): Promise<string> {
    return this.parser.toMarkdown(await this.readOutput(agentUrl), heading);
  }

  private async readOutput(agentUrl: string): Promise<string> {
    const out = await this.remote.readFile(agentUrl, OUT_FILE).catch(() => ({ content: '' }));
    return out.content;
  }

  private runScript(resumeSessionId?: string): string {
    const resume = resumeSessionId ? `--resume ${resumeSessionId} ` : '';
    return [
      '#!/bin/sh',
      'cd /workspace',
      `rm -f ${OUT_FILE} ${ERR_FILE} ${EXIT_FILE}`,
      `claude -p ${resume}--output-format stream-json --verbose --permission-mode bypassPermissions ` +
        `< ${PROMPT_FILE} > ${OUT_FILE} 2> ${ERR_FILE}`,
      `echo $? > ${EXIT_FILE}`,
      '',
    ].join('\n');
  }
}
