import { describe, expect, it } from 'vitest';
import type { WidgetContext, WidgetOutput } from '../types.js';
import { oauthHandoff, oauthPromptWidget } from './oauth-prompt.widget.js';

const ctx: WidgetContext = { documentName: 'o_auth_prompt', workflowId: 'wf-1' };

function capture() {
  const lines: string[] = [];
  const out: WidgetOutput = {
    block: (text) => lines.push(text),
    line: (text) => lines.push(text),
  };
  return { out, text: () => lines.join('\n') };
}

describe('oauthPromptWidget', () => {
  it('renders the sign-in link while pending', () => {
    const { out, text } = capture();
    oauthPromptWidget(
      { provider: 'google', authUrl: 'https://example.test/auth?state=abc', status: 'pending', state: 'abc' },
      ctx,
      out,
    );
    expect(text()).toContain('⧉ sign in with google: https://example.test/auth?state=abc');
    expect(text()).not.toContain('abc"'); // no raw JSON noise
  });

  it('renders the confirmation on success', () => {
    const { out, text } = capture();
    oauthPromptWidget(
      {
        provider: 'google',
        authUrl: 'https://example.test/auth',
        status: 'success',
        message: 'Successfully connected.',
      },
      ctx,
      out,
    );
    expect(text()).toContain('google connected — Successfully connected.');
    expect(text()).not.toContain('sign in with');
  });

  it('renders nothing without an authUrl', () => {
    const { out, text } = capture();
    oauthPromptWidget({ provider: 'google', status: 'pending' }, ctx, out);
    expect(text()).toBe('');
  });
});

describe('oauthHandoff', () => {
  it('points at the rendered sign-in link without repeating the URL', () => {
    expect(oauthHandoff({ provider: 'google', authUrl: 'https://example.test/auth', status: 'pending' })).toBe(
      'waiting for browser sign-in (google) — open the sign-in link above',
    );
  });

  it('returns nothing once connected or without a url', () => {
    expect(
      oauthHandoff({ provider: 'google', authUrl: 'https://example.test/auth', status: 'success' }),
    ).toBeUndefined();
    expect(oauthHandoff({ provider: 'google', status: 'pending' })).toBeUndefined();
  });
});
