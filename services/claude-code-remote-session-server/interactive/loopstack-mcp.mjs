// Minimal stateless stdio MCP server exposing Loopstack's exit-point tools, each gated by an env flag so
// tool availability is decided per session (the image no longer selects the mode):
//   - `ask_user`   — listed when LOOPSTACK_MCP_ASK_USER is set.
//   - `create_pr`  — listed when LOOPSTACK_MCP_CREATE_PR is set.
//
// Both are exit points: the tool records nothing and returns a fixed ack so Claude's tool call/result
// cycle completes and it ends its turn. The host reads the tool_use input from the transcript (the question,
// or the PR title/body) and acts on it. Newline-delimited JSON-RPC 2.0 over stdio.

const ASK_USER_ENABLED = !!process.env.LOOPSTACK_MCP_ASK_USER;
const CREATE_PR_ENABLED = !!process.env.LOOPSTACK_MCP_CREATE_PR;

const ASK_USER_ACK = 'Forwarded to the user successfully. Wait for the next user message.';
const CREATE_PR_ACK = 'Pull request details recorded successfully. End your turn now — the host opens the PR.';

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
