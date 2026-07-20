import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ClientMessage } from '@loopstack/contracts/events';
import { SSE_STREAM_OPTIONS } from '../interfaces/index.js';
import { SseEventService } from '../services/sse-event.service.js';
import { SseController } from './sse.controller.js';

const USER = { userId: 'user-1', workerId: 'worker-1', type: 'local', roles: [] };

function documentCreated(workflowId: string): ClientMessage {
  return { type: 'document.created', workflowId, userId: USER.userId, workerId: USER.workerId };
}

/**
 * Opens the SSE stream and resolves with the raw response text once `until`
 * matches or the timeout elapses.
 */
function readStream(
  port: number,
  path: string,
  options: { headers?: Record<string, string>; until?: (body: string) => boolean; timeoutMs?: number } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = http.get(`http://127.0.0.1:${port}${path}`, { headers: options.headers }, (response) => {
      let body = '';
      const finish = () => {
        clearTimeout(timeout);
        request.destroy();
        resolve(body);
      };
      const timeout = setTimeout(finish, options.timeoutMs ?? 500);
      response.on('data', (chunk: Buffer) => {
        body += chunk.toString('utf8');
        if (options.until?.(body)) finish();
      });
    });
    request.on('error', (error) => {
      // Destroying the socket after resolve surfaces as ECONNRESET — ignore.
      if (!(error as NodeJS.ErrnoException).code?.includes('ECONNRESET')) reject(error);
    });
  });
}

describe('SseController (wire)', () => {
  let app: INestApplication;
  let service: SseEventService;
  let port: number;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SseController],
      providers: [
        SseEventService,
        { provide: SSE_STREAM_OPTIONS, useValue: { bufferSize: 10, bufferTtlMs: 60_000, heartbeatIntervalMs: 100 } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = USER;
      next();
    });
    service = app.get(SseEventService);
    await app.init();
    await app.listen(0);
    port = (app.getHttpServer().address() as AddressInfo).port;
  });

  afterEach(async () => {
    await app.close();
  });

  it('emits frames with sequence ids', async () => {
    const bodyPromise = readStream(port, '/api/v1/sse/stream', { until: (b) => b.includes('"wf-2"') });
    await new Promise((r) => setTimeout(r, 50));
    service.handleClientMessage(documentCreated('wf-1'));
    service.handleClientMessage(documentCreated('wf-2'));

    const body = await bodyPromise;
    expect(body).toContain('id: 1');
    expect(body).toContain('id: 2');
    expect(body).toContain('"type":"document.created"');
  });

  it('sends heartbeat frames carrying the connection cursor', async () => {
    const body = await readStream(port, '/api/v1/sse/stream', {
      until: (b) => b.includes('ping'),
      timeoutMs: 1_000,
    });
    expect(body).toContain('event: ping');
    expect(body).toContain('id: 0');
  });

  it('replays missed events on reconnect via Last-Event-ID header', async () => {
    service.handleClientMessage(documentCreated('wf-1'));
    service.handleClientMessage(documentCreated('wf-2'));
    service.handleClientMessage(documentCreated('wf-3'));

    const body = await readStream(port, '/api/v1/sse/stream', {
      headers: { 'Last-Event-ID': '1' },
      until: (b) => b.includes('"wf-3"'),
    });
    expect(body).not.toContain('"wf-1"');
    expect(body).toContain('id: 2');
    expect(body).toContain('"wf-2"');
    expect(body).toContain('id: 3');
    expect(body).toContain('"wf-3"');
  });

  it('supports the lastEventId query fallback', async () => {
    service.handleClientMessage(documentCreated('wf-1'));
    service.handleClientMessage(documentCreated('wf-2'));

    const body = await readStream(port, '/api/v1/sse/stream?lastEventId=1', {
      until: (b) => b.includes('"wf-2"'),
    });
    expect(body).not.toContain('"wf-1"');
    expect(body).toContain('"wf-2"');
  });

  it('sends stream.reset carrying the latest sequence when the cursor is stale', async () => {
    service.handleClientMessage(documentCreated('wf-1'));

    const body = await readStream(port, '/api/v1/sse/stream', {
      headers: { 'Last-Event-ID': '999' },
      until: (b) => b.includes('stream.reset'),
    });
    expect(body).toContain('"type":"stream.reset"');
    expect(body).toContain('id: 1');
  });

  it('filters the stream by workflowId', async () => {
    const bodyPromise = readStream(port, '/api/v1/sse/stream?workflowId=wf-2', {
      until: (b) => b.includes('"wf-2"'),
    });
    await new Promise((r) => setTimeout(r, 50));
    service.handleClientMessage(documentCreated('wf-1'));
    service.handleClientMessage(documentCreated('wf-2'));

    const body = await bodyPromise;
    expect(body).not.toContain('"wf-1"');
    expect(body).toContain('"wf-2"');
  });
});
