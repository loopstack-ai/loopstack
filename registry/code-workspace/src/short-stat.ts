/** The numbers a round changed in one repo: what `git diff --shortstat` and `git rev-list --count` report. */
export interface RepoChangeCount {
  files: number;
  insertions: number;
  deletions: number;
  commits: number;
}

/**
 * Read `git diff --shortstat` — ` 3 files changed, 40 insertions(+), 2 deletions(-)` — into numbers. Any part
 * git leaves out (no insertions, no deletions, nothing at all) reads as zero.
 */
export function parseShortStat(output: string): Omit<RepoChangeCount, 'commits'> {
  const count = (pattern: RegExp): number => {
    const match = output.match(pattern);
    return match ? Number(match[1]) : 0;
  };
  return {
    files: count(/(\d+) files? changed/),
    insertions: count(/(\d+) insertions?\(\+\)/),
    deletions: count(/(\d+) deletions?\(-\)/),
  };
}
