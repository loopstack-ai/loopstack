/**
 * The resource a base build holds while it runs.
 *
 * One key per base, claimed **exclusively** by the run doing the build. It needs no capacity
 * configuration: an undeclared key admits one holder, which is exactly right.
 *
 * What it replaces is worth saying, because the difference is the whole point. A lock file has to guess
 * whether its holder is still alive — a heartbeat to refresh, a staleness threshold to break it after, and a
 * wait for the holder that may already be dead. A claim is alive exactly as long as the run that holds it:
 * a build whose process died frees its base the moment that run is no longer running, with nothing to
 * refresh and nothing to break.
 */
export const baseResource = (baseKey: string): string => `base:${baseKey}`;
