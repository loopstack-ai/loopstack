import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { WorkflowRunner } from '@loopstack/core';
import type { OAuthSession, OAuthSessionService } from '../../services/index.js';
import { OAuthCallbackController } from '../oauth-callback.controller.js';

function fakeSessions(sessions: Record<string, OAuthSession>): OAuthSessionService {
  return {
    consume: vi.fn(async (state: string) => {
      const session = sessions[state];
      delete sessions[state];
      return session;
    }),
    register: vi.fn(),
  } as unknown as OAuthSessionService;
}

function fakeRunner() {
  const calls: unknown[] = [];
  const runner = {
    runById: vi.fn(async (...args: unknown[]) => {
      calls.push(args);
      return { workflowId: args[0] };
    }),
  } as unknown as WorkflowRunner;
  return { runner, calls };
}

function fakeResponse() {
  const captured = { status: 0, body: '' };
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    type() {
      return this;
    },
    send(body: string) {
      captured.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, captured };
}

const SESSION: OAuthSession = { workflowId: 'wf-1', userId: 'user-1', provider: 'google' };

describe('OAuthCallbackController', () => {
  it('POST complete fires exchangeToken as the recorded user with the API envelope', async () => {
    const { runner } = fakeRunner();
    const controller = new OAuthCallbackController(fakeSessions({ 'state-1': SESSION }), runner);

    const result = await controller.complete({ code: 'auth-code', state: 'state-1' });

    expect(result).toEqual({ ok: true, provider: 'google' });
    expect(runner.runById).toHaveBeenCalledWith('wf-1', 'user-1', {
      transition: {
        id: 'exchangeToken',
        workflowId: 'wf-1',
        payload: {
          workflowId: 'wf-1',
          status: 'completed',
          hasError: false,
          errorMessage: null,
          data: { code: 'auth-code', state: 'state-1' },
        },
      },
    });
  });

  it('POST complete rejects unknown or already-used states', async () => {
    const { runner } = fakeRunner();
    const controller = new OAuthCallbackController(fakeSessions({}), runner);

    await expect(controller.complete({ code: 'auth-code', state: 'unknown' })).rejects.toThrow(BadRequestException);
    expect(runner.runById).not.toHaveBeenCalled();
  });

  it('GET callback completes the flow and renders the connected page', async () => {
    const { runner } = fakeRunner();
    const controller = new OAuthCallbackController(fakeSessions({ 'state-1': SESSION }), runner);
    const { res, captured } = fakeResponse();

    await controller.callback(res, 'auth-code', 'state-1');

    expect(captured.status).toBe(200);
    expect(captured.body).toContain('Sign-in with google received');
    expect(captured.body).toContain('window.close');
    expect(runner.runById).toHaveBeenCalledTimes(1);
  });

  it('GET callback renders the expired page for unknown states without firing anything', async () => {
    const { runner } = fakeRunner();
    const controller = new OAuthCallbackController(fakeSessions({}), runner);
    const { res, captured } = fakeResponse();

    await controller.callback(res, 'auth-code', 'stale-state');

    expect(captured.status).toBe(400);
    expect(captured.body).toContain('expired or was already used');
    expect(runner.runById).not.toHaveBeenCalled();
  });

  it('GET callback reports provider-side errors without consuming the session', async () => {
    const { runner } = fakeRunner();
    const sessions = fakeSessions({ 'state-1': SESSION });
    const controller = new OAuthCallbackController(sessions, runner);
    const { res, captured } = fakeResponse();

    await controller.callback(res, undefined, 'state-1', 'access_denied', 'User denied access');

    expect(captured.status).toBe(400);
    expect(captured.body).toContain('User denied access');
    expect(sessions.consume).not.toHaveBeenCalled();
    expect(runner.runById).not.toHaveBeenCalled();
  });

  it('GET callback rejects requests without code or state', async () => {
    const { runner } = fakeRunner();
    const controller = new OAuthCallbackController(fakeSessions({}), runner);
    const { res, captured } = fakeResponse();

    await controller.callback(res, undefined, undefined);

    expect(captured.status).toBe(400);
    expect(captured.body).toContain('Missing code or state');
    expect(runner.runById).not.toHaveBeenCalled();
  });
});
