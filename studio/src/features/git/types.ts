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

export interface GitRemoteResponse {
  name: string;
  url: string;
}

/** One repository of the workspace, as the application declared it. `dir` is empty for the root. */
export interface GitRepository {
  key: string;
  dir: string;
  url?: string;
  branch?: string;
  primary?: boolean;
}

export interface GitReposResponse {
  repos: GitRepository[];
}
