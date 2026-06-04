import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  Guard,
  LinkDocument,
  MessageDocument,
  QueueResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';
import { RemoteClient } from '@loopstack/remote-client';
import { ClaudeAuthService } from './claude-auth.service';
import { LocalSandboxService } from './local-sandbox.service';

const CodeCallbackSchema = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});

type CodeCallback = z.infer<typeof CodeCallbackSchema>;

interface ClaudeSandboxState {
  token?: string;
  verifier?: string;
  oauthState?: string;
  containerId?: string;
  agentUrl?: string;
}

const ClaudeSandboxArgsSchema = z
  .object({
    task: z
      .string()
      .default('Create a file hello.txt containing a friendly greeting, then tell me what you did.')
      .describe('The task Claude Code should perform inside the sandbox.'),
  })
  .strict();

type ClaudeSandboxArgs = z.infer<typeof ClaudeSandboxArgsSchema>;

const RUN_SCRIPT = `#!/bin/sh
cd /workspace
rm -f .claude-job.out .claude-job.err .claude-job.exit
claude -p --output-format json --permission-mode bypassPermissions < .claude-prompt.txt > .claude-job.out 2> .claude-job.err
echo $? > .claude-job.exit
`;

@Workflow({
  title: 'Claude Code Sandbox',
  description:
    'Spins up a blank, sandboxed Linux container (no Loopstack instance) running Claude Code, ' +
    'delegates a task to it via the remote agent, polls for completion and returns the result. ' +
    'Authenticates with your Claude subscription on first use.',
  schema: ClaudeSandboxArgsSchema,
})
export class ClaudeCodeWorkflow extends BaseWorkflow<ClaudeSandboxArgs, ClaudeSandboxState> {
  constructor(
    private readonly sandbox: LocalSandboxService,
    private readonly remote: RemoteClient,
    private readonly auth: ClaudeAuthService,
    private readonly askUser: AskUserWorkflow,
  ) {
    super();
  }

  @Transition({ to: 'auth' })
  async start(state: ClaudeSandboxState, ctx: LoopstackContext): Promise<ClaudeSandboxState> {
    const token = await this.auth.getValidToken(ctx.userId);
    return { ...state, token };
  }

  hasToken(state: ClaudeSandboxState): boolean {
    return !!state.token;
  }

  @Transition({ from: 'auth', to: 'ready', priority: 10 })
  @Guard('hasToken')
  alreadyAuthed(state: ClaudeSandboxState): Promise<ClaudeSandboxState> {
    return Promise.resolve(state);
  }

  @Transition({ from: 'auth', to: 'awaiting_login' })
  async needLogin(state: ClaudeSandboxState): Promise<ClaudeSandboxState> {
    const { authUrl, verifier, state: oauthState } = this.auth.begin();

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content:
        'A Claude subscription login is required.\n\n' +
        `1. Open this link and sign in: [Authorize Claude Code](${authUrl})\n` +
        '2. Copy the code shown on the callback page (format `code#state`).\n' +
        '3. Paste it into the input below.',
    });

    const result: QueueResult = await this.askUser.run(
      { question: 'Paste the authorization code from the Claude callback page:' },
      { callback: { transition: 'codeReceived' } },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        status: 'pending',
        label: 'Waiting for authorization code…',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );

    return { ...state, verifier, oauthState };
  }

  @Transition({
    from: 'awaiting_login',
    to: 'ready',
    wait: true,
    schema: CodeCallbackSchema,
  })
  async codeReceived(
    state: ClaudeSandboxState,
    payload: CodeCallback,
    ctx: LoopstackContext,
  ): Promise<ClaudeSandboxState> {
    const token = await this.auth.completeLogin(ctx.userId, payload.data.answer, state.verifier!, state.oauthState!);

    await this.documentStore.save(
      LinkDocument,
      { status: 'success', label: 'Authorization code received', workflowId: payload.workflowId },
      { id: `link_${payload.workflowId}` },
    );

    return { ...state, token };
  }

  @Transition({ from: 'ready', to: 'running' })
  async launch(state: ClaudeSandboxState, ctx: LoopstackContext): Promise<ClaudeSandboxState> {
    const { task } = ctx.args as ClaudeSandboxArgs;

    const { containerId, agentUrl } = await this.sandbox.provision(ctx.workspaceId, state.token);

    await this.remote.writeFile(agentUrl, '.claude-prompt.txt', task);
    await this.remote.writeFile(agentUrl, 'run-claude.sh', RUN_SCRIPT);
    await this.remote.executeCommand(
      agentUrl,
      'chmod +x run-claude.sh && nohup ./run-claude.sh >/dev/null 2>&1 & echo launched',
    );

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Sandbox ready at \`${agentUrl}\`. Claude Code is working on:\n\n> ${task}`,
    });

    return { ...state, containerId, agentUrl };
  }

  // retry acts as the poll loop: throw while running → re-checked after the delay.
  @Transition({
    from: 'running',
    to: 'collecting',
    retry: { attempts: 240, delay: 5000, backoff: 'fixed' },
  })
  async pollClaude(state: ClaudeSandboxState): Promise<ClaudeSandboxState> {
    const result = await this.remote.executeCommand(
      state.agentUrl!,
      'cat .claude-job.exit 2>/dev/null || echo RUNNING',
    );
    const value = result.stdout.trim();
    if (value === '' || value === 'RUNNING') {
      throw new Error('Claude Code is still running');
    }
    return state;
  }

  @Transition({ from: 'collecting', to: 'cleanup' })
  async collectResult(state: ClaudeSandboxState): Promise<ClaudeSandboxState> {
    const agentUrl = state.agentUrl!;

    const exitResult = await this.remote.executeCommand(agentUrl, 'cat .claude-job.exit 2>/dev/null || echo 1');
    const exitCode = parseInt(exitResult.stdout.trim(), 10) || 0;

    const out = await this.remote.readFile(agentUrl, '.claude-job.out').catch(() => ({ content: '' }));
    const tree = await this.remote.executeCommand(agentUrl, 'ls -la');

    let summary = out.content;
    try {
      const parsed = JSON.parse(out.content) as { result?: string };
      if (parsed.result) summary = parsed.result;
    } catch {
      /* raw output */
    }

    if (exitCode !== 0) {
      const err = await this.remote.readFile(agentUrl, '.claude-job.err').catch(() => ({ content: '' }));
      summary = `Claude Code exited with code ${exitCode}.\n\n${err.content || summary}`;
    }

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `**Claude Code result** (exit ${exitCode}):\n\n${summary}\n\n---\nWorkspace contents:\n\`\`\`\n${tree.stdout}\`\`\``,
    });

    return state;
  }

  @Transition({ from: 'cleanup', to: 'end' })
  async cleanup(state: ClaudeSandboxState): Promise<unknown> {
    if (state.containerId) {
      await this.sandbox.teardown(state.containerId);
    }
    return {};
  }
}
