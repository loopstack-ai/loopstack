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
