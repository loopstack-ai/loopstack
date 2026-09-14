// Minimal stateless stdio MCP server exposing Loopstack's exit-point tools, each gated by an env flag so
// tool availability is decided per session (the image no longer selects the mode):
//   - `ask_user`            — listed when LOOPSTACK_MCP_ASK_USER is set.
//   - `create_pr`           — listed when LOOPSTACK_MCP_CREATE_PR is set.
//   - `create_github_issue` — listed when LOOPSTACK_MCP_CREATE_ISSUE is set.
//
// Each records nothing and returns a fixed ack so Claude's tool call/result cycle completes. The host reads
// the tool_use input from the transcript (the question, the PR title/body, or each issue's title/body/category)
// and acts on it. `ask_user`/`create_pr` are single exit points (end the turn); `create_github_issue` may be
// called repeatedly within a turn (the host accumulates them). Newline-delimited JSON-RPC 2.0 over stdio.

const ASK_USER_ENABLED = !!process.env.LOOPSTACK_MCP_ASK_USER;
const CREATE_PR_ENABLED = !!process.env.LOOPSTACK_MCP_CREATE_PR;
const CREATE_ISSUE_ENABLED = !!process.env.LOOPSTACK_MCP_CREATE_ISSUE;

const ASK_USER_ACK = 'Forwarded to the user successfully. Wait for the next user message.';
const CREATE_PR_ACK = 'Pull request details recorded successfully. End your turn now — the host opens the PR.';
const CREATE_ISSUE_ACK =
  'Issue request recorded. Loopstack creates it and returns the link. You may request more issues, or ' +
  'continue working / ask the user — do NOT end your turn solely because of this call.';

const ISSUE_CATEGORIES = ['example', 'feature', 'core', 'documentation', 'test', 'studio'];

const TOOLS = {
  ask_user: {
    enabled: ASK_USER_ENABLED,
    ack: ASK_USER_ACK,
    def: {
      name: 'ask_user',
      description:
        'Ask the human user a single free-text question when you need information only they can provide (a ' +
        'clarification, a decision, a missing detail). After calling this tool you MUST end your turn ' +
        "immediately and take no further action — you will be resumed later with the user's answer as the " +
        'next user message.',
      inputSchema: {
        type: 'object',
        properties: { question: { type: 'string', description: 'The question to ask the user.' } },
        required: ['question'],
      },
    },
  },
  create_pr: {
    enabled: CREATE_PR_ENABLED,
    ack: CREATE_PR_ACK,
    def: {
      name: 'create_pr',
      description:
        'Define the pull request for the work on the current branch. Call this exactly once, when the work ' +
        'is ready for review, with a title and a body written for a reviewer who has no prior context. After ' +
        'calling this tool you MUST end your turn immediately — the host opens the PR from these details.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Concise PR title (a conventional-commit-style subject works well).' },
          body: {
            type: 'string',
            description:
              'PR description in Markdown: what changed and why, how to test, and any notable risks — enough ' +
              'for a reviewer with no prior context to review it.',
          },
        },
        required: ['title', 'body'],
      },
    },
  },
  create_github_issue: {
    enabled: CREATE_ISSUE_ENABLED,
    ack: CREATE_ISSUE_ACK,
    def: {
      name: 'create_github_issue',
      description:
        'Request a GitHub issue to be created for an improvement idea you have confirmed with the user. The ' +
        'issue presents an IDEA only — not a decision, detailed concept, or implementation plan. Loopstack ' +
        'creates the issue (with the category as a label) and returns the link. You MAY call this multiple ' +
        'times (one per idea) and you do NOT need to end your turn because of it — keep working or ask the user.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Concise issue title describing the idea.' },
          body: {
            type: 'string',
            description:
              'Issue body in Markdown: the idea, the gap it addresses, the rationale, and a short note on basic ' +
              'feasibility. An idea only — no final decision, detailed concept, or implementation plan.',
          },
          category: {
            type: 'string',
            enum: ISSUE_CATEGORIES,
            description:
              'Scope of the idea: "example"/"feature" for registry packages, "core" for loopstack/packages, ' +
              '"documentation", "test", or "studio" for the frontend.',
          },
          declineReason: {
            type: 'string',
            description:
              'Optional. When set, the issue is created and IMMEDIATELY closed as "not planned" with this ' +
              'reason posted as a comment — use only for an idea the user chose to RECORD AS DECLINED (so it ' +
              "won't be re-suggested later), not for an idea to pursue. Omit for a normal open idea.",
          },
        },
        required: ['title', 'body', 'category'],
      },
    },
  },
};

function enabledTools() {
  return Object.values(TOOLS)
    .filter((t) => t.enabled)
    .map((t) => t.def);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (line) handle(line);
  }
});

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function handle(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = message;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'loopstack', version: '0.1.0' },
      },
    });
  } else if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: enabledTools() } });
  } else if (method === 'tools/call') {
    const tool = TOOLS[params?.name];
    if (tool && tool.enabled) {
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: tool.ack }] } });
    } else {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${params?.name}` } });
    }
  } else if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} });
  } else if (id !== undefined && method && !method.startsWith('notifications/')) {
    send({ jsonrpc: '2.0', id, result: {} });
  }
  // notifications (no id) are ignored
}
