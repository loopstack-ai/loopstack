// Minimal stateless stdio MCP server exposing a single `ask_user` tool.
//
// It records nothing and never blocks: it returns a fixed ack so Claude's tool call/result cycle
// completes and Claude ends its turn. The host reads the question from the transcript (the tool_use
// input) and resumes the session with the user's answer. Newline-delimited JSON-RPC 2.0 over stdio.
const ACK = 'Forwarded to the user successfully. Wait for the next user message.';

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
    send({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'ask_user',
            description:
              'Ask the human user a single free-text question when you need information only they can ' +
              'provide (a clarification, a decision, a missing detail). After calling this tool you MUST ' +
              'end your turn immediately and take no further action — you will be resumed later with the ' +
              "user's answer as the next user message.",
            inputSchema: {
              type: 'object',
              properties: { question: { type: 'string', description: 'The question to ask the user.' } },
              required: ['question'],
            },
          },
        ],
      },
    });
  } else if (method === 'tools/call') {
    if (params?.name === 'ask_user') {
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: ACK }] } });
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
