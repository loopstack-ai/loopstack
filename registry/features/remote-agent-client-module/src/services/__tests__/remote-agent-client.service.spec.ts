import { RemoteAgentClient } from '../remote-agent-client.service';

const CONNECTION_URL = 'https://fly-instance.fly.dev';

describe('RemoteAgentClient', () => {
  let client: RemoteAgentClient;
  let fetchMock: jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;

  beforeEach(() => {
    client = new RemoteAgentClient();
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('writeFile', () => {
    it('should POST to /files/write with path and content', async () => {
      await client.writeFile(CONNECTION_URL, '/app/index.ts', 'console.log("hi")');

      expect(fetchMock).toHaveBeenCalledWith(
        `${CONNECTION_URL}/files/write`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ path: '/app/index.ts', content: 'console.log("hi")' }),
        }),
      );
    });

    it('should throw on non-ok response', async () => {
      fetchMock.mockResolvedValue(new Response('Server error', { status: 500 }));

      await expect(client.writeFile(CONNECTION_URL, '/app/index.ts', 'content')).rejects.toThrow(
        'Remote agent request failed: POST /files/write → 500',
      );
    });
  });

  describe('readFile', () => {
    it('should GET /files/read with URL-encoded path', async () => {
      const responseBody = { content: 'file content' };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const result = await client.readFile(CONNECTION_URL, '/app/my file.ts');

      expect(fetchMock).toHaveBeenCalledWith(
        `${CONNECTION_URL}/files/read?path=%2Fapp%2Fmy%20file.ts`,
        expect.objectContaining({
          method: 'GET',
        }),
      );
      expect(result).toEqual({ content: 'file content' });
    });
  });

  describe('executeCommand', () => {
    it('should POST to /exec with command and cwd', async () => {
      const responseBody = { stdout: 'output', stderr: '', exitCode: 0 };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const result = await client.executeCommand(CONNECTION_URL, 'ls -la', '/app');

      expect(fetchMock).toHaveBeenCalledWith(
        `${CONNECTION_URL}/exec`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ command: 'ls -la', cwd: '/app' }),
        }),
      );
      expect(result).toEqual({ stdout: 'output', stderr: '', exitCode: 0 });
    });

    it('should send command without cwd when not provided', async () => {
      const responseBody = { stdout: '', stderr: '', exitCode: 0 };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      await client.executeCommand(CONNECTION_URL, 'pwd');

      expect(fetchMock).toHaveBeenCalledWith(
        `${CONNECTION_URL}/exec`,
        expect.objectContaining({
          body: JSON.stringify({ command: 'pwd', cwd: undefined }),
        }),
      );
    });

    it('should throw on error response', async () => {
      fetchMock.mockResolvedValue(new Response('Server error', { status: 500 }));

      await expect(client.executeCommand(CONNECTION_URL, 'ls')).rejects.toThrow(
        'Remote agent request failed: POST /exec → 500',
      );
    });
  });
});
