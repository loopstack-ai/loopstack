import { Injectable, Logger } from '@nestjs/common';

export interface FileReadResponse {
  content: string;
}

export interface FileEditResponse {
  success: boolean;
  path: string;
  replacements: number;
}

export interface ExecResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface GlobResponse {
  files: string[];
}

export interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export interface GrepResponse {
  matches: GrepMatch[];
}

export interface LogsResponse {
  stdout: string;
  stderr: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

// --- Git interfaces ---

export interface GitStatusResponse {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitLogResponse {
  commits: GitCommit[];
}

export interface GitBranchesResponse {
  current: string;
  branches: { name: string; isCurrent: boolean }[];
}

export interface GitRemoteResponse {
  name: string;
  url: string;
}

export interface GitDiffFile {
  path: string;
  status: string;
}

export interface GitDiffResponse {
  files: GitDiffFile[];
}

export interface GitCommandResult {
  success: boolean;
  output?: string;
}

@Injectable()
export class RemoteAgentClient {
  private readonly logger = new Logger(RemoteAgentClient.name);

  async writeFile(connectionUrl: string, path: string, content: string): Promise<void> {
    await this.doRequest(connectionUrl, 'POST', '/files/write', { path, content });
  }

  async readFile(connectionUrl: string, path: string, offset?: number, limit?: number): Promise<FileReadResponse> {
    let query = `path=${encodeURIComponent(path)}`;
    if (offset !== undefined) query += `&offset=${offset}`;
    if (limit !== undefined) query += `&limit=${limit}`;
    return this.doRequest<FileReadResponse>(connectionUrl, 'GET', `/files/read?${query}`);
  }

  async editFile(
    connectionUrl: string,
    path: string,
    oldString: string,
    newString: string,
    replaceAll?: boolean,
  ): Promise<FileEditResponse> {
    return this.doRequest<FileEditResponse>(connectionUrl, 'POST', '/files/edit', {
      path,
      old_string: oldString,
      new_string: newString,
      replace_all: replaceAll,
    });
  }

  async executeCommand(connectionUrl: string, command: string, cwd?: string, timeout?: number): Promise<ExecResponse> {
    return this.doRequest<ExecResponse>(connectionUrl, 'POST', '/exec', { command, cwd, timeout });
  }

  async glob(connectionUrl: string, pattern: string, path?: string): Promise<GlobResponse> {
    return this.doRequest<GlobResponse>(connectionUrl, 'POST', '/files/glob', { pattern, path });
  }

  async grep(
    connectionUrl: string,
    pattern: string,
    path?: string,
    options?: { glob?: string; type?: string; caseInsensitive?: boolean },
  ): Promise<GrepResponse> {
    return this.doRequest<GrepResponse>(connectionUrl, 'POST', '/files/grep', {
      pattern,
      path,
      glob: options?.glob,
      type: options?.type,
      case_insensitive: options?.caseInsensitive,
    });
  }

  async rebuildApp(connectionUrl: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`rebuildApp: calling POST ${connectionUrl}/app/rebuild`);
    const result = await this.doRequest<{ success: boolean; message: string }>(connectionUrl, 'POST', '/app/rebuild');
    this.logger.log(`rebuildApp: result = ${JSON.stringify(result)}`);
    return result;
  }

  async getLogs(connectionUrl: string, lines?: number, type?: 'out' | 'error' | 'all'): Promise<LogsResponse> {
    let query = '';
    if (lines !== undefined) query += `lines=${lines}`;
    if (type !== undefined) query += `${query ? '&' : ''}type=${type}`;
    const path = query ? `/app/logs?${query}` : '/app/logs';
    return this.doRequest<LogsResponse>(connectionUrl, 'GET', path);
  }

  async setEnvVars(
    connectionUrl: string,
    variables: { key: string; value: string }[],
  ): Promise<{ success: boolean; count: number; restarted: boolean }> {
    this.logger.log(
      `setEnvVars: calling PUT ${connectionUrl}/app/env with ${variables.length} variables [values redacted]`,
    );
    const result = await this.doRequest<{ success: boolean; count: number; restarted: boolean }>(
      connectionUrl,
      'PUT',
      '/app/env',
      { variables },
      { redactBody: true },
    );
    this.logger.log(
      `setEnvVars: result = { success: ${result.success}, count: ${result.count}, restarted: ${result.restarted} }`,
    );
    return result;
  }

  async resetWorkspace(connectionUrl: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`resetWorkspace: calling POST ${connectionUrl}/app/reset`);
    const result = await this.doRequest<{ success: boolean; message: string }>(connectionUrl, 'POST', '/app/reset');
    this.logger.log(`resetWorkspace: result = ${JSON.stringify(result)}`);
    return result;
  }

  async getFileTree(connectionUrl: string, basePath?: string): Promise<FileTreeNode[]> {
    const path = basePath ? `/files/tree?path=${encodeURIComponent(basePath)}` : '/files/tree';
    return this.doRequest<FileTreeNode[]>(connectionUrl, 'GET', path);
  }

  // --- Git operations ---

  async gitStatus(connectionUrl: string): Promise<GitStatusResponse> {
    return this.doRequest<GitStatusResponse>(connectionUrl, 'GET', '/git/status');
  }

  async gitLog(connectionUrl: string, limit?: number): Promise<GitLogResponse> {
    const query = limit ? `?limit=${limit}` : '';
    return this.doRequest<GitLogResponse>(connectionUrl, 'GET', `/git/log${query}`);
  }

  async gitDiff(connectionUrl: string, staged?: boolean): Promise<GitDiffResponse> {
    const query = staged ? '?staged=true' : '';
    return this.doRequest<GitDiffResponse>(connectionUrl, 'GET', `/git/diff${query}`);
  }

  async gitBranches(connectionUrl: string): Promise<GitBranchesResponse> {
    return this.doRequest<GitBranchesResponse>(connectionUrl, 'GET', '/git/branches');
  }

  async gitRemote(connectionUrl: string): Promise<GitRemoteResponse | null> {
    return this.doRequest<GitRemoteResponse | null>(connectionUrl, 'GET', '/git/remote');
  }

  async gitAdd(connectionUrl: string, files: string[]): Promise<{ success: boolean }> {
    return this.doRequest<{ success: boolean }>(connectionUrl, 'POST', '/git/add', { files });
  }

  async gitCommit(connectionUrl: string, message: string): Promise<{ hash: string; message: string }> {
    return this.doRequest<{ hash: string; message: string }>(connectionUrl, 'POST', '/git/commit', { message });
  }

  async gitPush(
    connectionUrl: string,
    options?: { remote?: string; branch?: string; force?: boolean; token?: string },
  ): Promise<GitCommandResult> {
    return this.doRequest<GitCommandResult>(connectionUrl, 'POST', '/git/push', options ?? {}, {
      redactBody: !!options?.token,
    });
  }

  async gitFetch(connectionUrl: string, remote?: string, token?: string): Promise<GitCommandResult> {
    return this.doRequest<GitCommandResult>(
      connectionUrl,
      'POST',
      '/git/fetch',
      { remote, token },
      {
        redactBody: !!token,
      },
    );
  }

  async gitPull(
    connectionUrl: string,
    options?: { remote?: string; branch?: string; token?: string },
  ): Promise<GitCommandResult> {
    return this.doRequest<GitCommandResult>(connectionUrl, 'POST', '/git/pull', options ?? {}, {
      redactBody: !!options?.token,
    });
  }

  async gitCheckout(connectionUrl: string, branch: string, create?: boolean): Promise<{ branch: string }> {
    return this.doRequest<{ branch: string }>(connectionUrl, 'POST', '/git/checkout', { branch, create });
  }

  async gitBranch(connectionUrl: string, name: string): Promise<{ branch: string }> {
    return this.doRequest<{ branch: string }>(connectionUrl, 'POST', '/git/branch', { name });
  }

  async gitRemoveRemote(connectionUrl: string, name?: string): Promise<{ success: boolean }> {
    return this.doRequest<{ success: boolean }>(connectionUrl, 'DELETE', '/git/remote', { name: name ?? 'origin' });
  }

  async gitConfigureRemote(connectionUrl: string, url: string): Promise<{ success: boolean }> {
    return this.doRequest<{ success: boolean }>(connectionUrl, 'POST', '/git/remote/configure', { url });
  }

  async gitConfigUser(connectionUrl: string, name: string, email: string): Promise<{ success: boolean }> {
    return this.doRequest<{ success: boolean }>(connectionUrl, 'POST', '/git/config-user', { name, email });
  }

  private async doRequest<T = void>(
    connectionUrl: string,
    method: string,
    path: string,
    body?: Record<string, unknown>,
    options?: { redactBody?: boolean },
  ): Promise<T> {
    const url = `${connectionUrl}${path}`;
    this.logger.log(`→ ${method} ${url}`);
    if (body) {
      this.logger.log(`  body: ${options?.redactBody ? '[redacted]' : JSON.stringify(body)}`);
    }

    const headers: Record<string, string> = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      this.logger.error(`← Connection failed: ${method} ${url} — ${cause}`);
      throw new Error(`Failed to connect to remote environment at ${connectionUrl}: ${cause}`, { cause: error });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.log(`← ${response.status} ${errorBody}`);
      throw new Error(`Remote agent request failed: ${method} ${path} → ${response.status}: ${errorBody}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = (await response.json()) as T;
      this.logger.log(`← ${response.status} ${JSON.stringify(data)}`);
      return data;
    }

    this.logger.log(`← ${response.status} (no body / no JSON content-type: ${response.headers.get('content-type')})`);
    return undefined as T;
  }
}
