import { Injectable } from '@nestjs/common';

/**
 * The git calls that have to name a **repo directory**, talking to the engineer's own session server.
 *
 * `RemoteClient` from `@loopstack/remote-client` runs every git command at the workspace root, which is
 * exactly right while a checkout holds one repo and wrong as soon as it holds several. These two calls
 * carry a `dir`, and they go direct because the framework client is a published package: widening its
 * signature would mean a release and a dependency bump before a sandbox could use it, for a route this
 * repo already ships its own copy of (`server/src/routes/git.ts`).
 *
 * Only clone and fetch live here, and only because they carry a **token**: the server applies it through a
 * throwaway `GIT_ASKPASS`, so it never reaches the URL, argv or `.git/config`. Every other per-repo git
 * command is a plain `executeCommand(agentUrl, cmd, dir)` and needs nothing special.
 */
@Injectable()
export class RepoGitClient {
  /** Clone `url` into `dir` (relative to the workspace root), creating the directory if needed. */
  async clone(agentUrl: string, options: { url: string; dir: string; branch?: string; token?: string }): Promise<void> {
    await this.post(agentUrl, '/git/clone', {
      url: options.url,
      dir: options.dir,
      branch: options.branch,
      token: options.token,
    });
  }

  /** Fetch `remote` in the repo at `dir`, so remote-tracking refs are current. */
  async fetch(agentUrl: string, options: { dir: string; remote?: string; token?: string }): Promise<void> {
    await this.post(agentUrl, '/git/fetch', {
      dir: options.dir,
      remote: options.remote ?? 'origin',
      token: options.token,
    });
  }

  /** Push `branch` to `remote` from the repo at `dir`. A rejected push (the remote moved) throws with git's output. */
  async push(
    agentUrl: string,
    options: { dir: string; remote?: string; branch: string; token?: string },
  ): Promise<void> {
    await this.post(agentUrl, '/git/push', {
      dir: options.dir,
      remote: options.remote ?? 'origin',
      branch: options.branch,
      token: options.token,
    });
  }

  private async post(agentUrl: string, route: string, body: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${agentUrl.replace(/\/+$/, '')}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) return;
    // The body carries git's own stderr, which is the only useful part of a clone failure. The request body
    // is never echoed back — it holds the token.
    const detail = await response.text().catch(() => '');
    throw new Error(`${route} failed (${response.status})${detail ? `: ${detail.slice(0, 500)}` : ''}`);
  }
}
