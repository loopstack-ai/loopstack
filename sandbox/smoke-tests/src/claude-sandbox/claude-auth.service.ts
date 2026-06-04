import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// OAuth constants for the Claude subscription flow, read from the claude-code binary.
const CLIENT_ID = process.env.CLAUDE_OAUTH_CLIENT_ID ?? '9d1c250a-e61b-44d9-88ed-5944d1962f5e';
const AUTHORIZE_URL = process.env.CLAUDE_OAUTH_AUTHORIZE_URL ?? 'https://claude.com/cai/oauth/authorize';
const TOKEN_URL = process.env.CLAUDE_OAUTH_TOKEN_URL ?? 'https://platform.claude.com/v1/oauth/token';
const REDIRECT_URI = process.env.CLAUDE_OAUTH_REDIRECT_URI ?? 'https://platform.claude.com/oauth/code/callback';
const SCOPE = process.env.CLAUDE_OAUTH_SCOPE ?? 'user:inference';

interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface LoginChallenge {
  authUrl: string;
  verifier: string;
  state: string;
}

@Injectable()
export class ClaudeAuthService {
  private readonly logger = new Logger(ClaudeAuthService.name);
  private readonly storePath = process.env.CLAUDE_TOKEN_STORE ?? join(process.cwd(), '.claude-oauth.json');

  async getValidToken(userId: string): Promise<string | undefined> {
    if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return process.env.CLAUDE_CODE_OAUTH_TOKEN;

    const stored = this.read()[userId];
    if (!stored) return undefined;
    if (Date.now() < stored.expiresAt - 60_000) return stored.accessToken;

    if (stored.refreshToken) {
      try {
        const refreshed = await this.refresh(stored.refreshToken);
        this.write(userId, refreshed);
        return refreshed.accessToken;
      } catch (error) {
        this.logger.warn(`Claude token refresh failed for ${userId}: ${this.message(error)}`);
      }
    }
    return undefined;
  }

  begin(): LoginChallenge {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const state = randomBytes(32).toString('hex');

    const params = new URLSearchParams({
      code: 'true',
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    });
    return { authUrl: `${AUTHORIZE_URL}?${params.toString()}`, verifier, state };
  }

  async completeLogin(userId: string, pasted: string, verifier: string, expectedState: string): Promise<string> {
    // Claude returns the code as `code#state`.
    const [code, returnedState] = pasted.trim().split('#');
    if (returnedState && returnedState !== expectedState) {
      throw new Error('OAuth state mismatch — please restart the login.');
    }

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        state: expectedState,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }),
    });
    if (!res.ok) {
      throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
    }

    const token = this.toStoredToken(await res.json());
    this.write(userId, token);
    return token.accessToken;
  }

  private async refresh(refreshToken: string): Promise<StoredToken> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: CLIENT_ID }),
    });
    if (!res.ok) {
      throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
    }
    return this.toStoredToken(await res.json());
  }

  private toStoredToken(body: unknown): StoredToken {
    const data = body as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!data.access_token) {
      throw new Error('Token response did not contain an access_token');
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
  }

  private read(): Record<string, StoredToken> {
    if (!existsSync(this.storePath)) return {};
    try {
      return JSON.parse(readFileSync(this.storePath, 'utf-8')) as Record<string, StoredToken>;
    } catch {
      return {};
    }
  }

  private write(userId: string, token: StoredToken): void {
    const all = this.read();
    all[userId] = token;
    mkdirSync(dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, JSON.stringify(all, null, 2), { mode: 0o600 });
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
