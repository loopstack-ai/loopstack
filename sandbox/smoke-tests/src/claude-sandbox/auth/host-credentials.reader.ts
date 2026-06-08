import { Injectable, Logger } from '@nestjs/common';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { StoredToken } from './auth.types';

/**
 * Reads the access token from the local Claude Code login, the same way the CLI stores it:
 * the macOS Keychain on darwin, otherwise `~/.claude/.credentials.json` (Linux / WSL / Windows).
 *
 * Enabled via the `CLAUDE_SANDBOX_HOST_AUTH` env var (`true`/`1`, or an explicit config dir path).
 * The resolved token is injected into the sandbox as `CLAUDE_CODE_OAUTH_TOKEN`, so reuse of the
 * local login is OS-agnostic on the container side — no bind mounts, uid, or path concerns.
 */
@Injectable()
export class HostCredentialsReader {
  private readonly logger = new Logger(HostCredentialsReader.name);

  get enabled(): boolean {
    return !!process.env.CLAUDE_SANDBOX_HOST_AUTH;
  }

  read(): StoredToken | undefined {
    if (!this.enabled) return undefined;
    if (process.platform === 'darwin') {
      const fromKeychain = this.readFromKeychain();
      if (fromKeychain) return fromKeychain;
    }
    return this.readFromFile();
  }

  private readFromFile(): StoredToken | undefined {
    const value = process.env.CLAUDE_SANDBOX_HOST_AUTH;
    const dir = value && value !== '1' && value.toLowerCase() !== 'true' ? value : join(homedir(), '.claude');
    const file = join(dir, '.credentials.json');
    if (!existsSync(file)) return undefined;
    try {
      return this.parse(readFileSync(file, 'utf-8'));
    } catch (error) {
      this.logger.warn(`Failed to read ${file}: ${this.message(error)}`);
      return undefined;
    }
  }

  private readFromKeychain(): StoredToken | undefined {
    try {
      const out = execFileSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], {
        encoding: 'utf-8',
      });
      return this.parse(out);
    } catch {
      return undefined; // not present in the keychain
    }
  }

  private parse(raw: string): StoredToken | undefined {
    const data = JSON.parse(raw) as {
      claudeAiOauth?: { accessToken?: string; refreshToken?: string; expiresAt?: number };
    };
    const oauth = data.claudeAiOauth;
    if (!oauth?.accessToken) return undefined;
    return { accessToken: oauth.accessToken, refreshToken: oauth.refreshToken, expiresAt: oauth.expiresAt ?? 0 };
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
