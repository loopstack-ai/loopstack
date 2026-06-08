export const DEFAULT_TASK = [
  'Build a small Loopstack automation: a workflow called "StandupSummary" that takes a list',
  'of free-text status updates and produces a concise daily standup summary grouped into',
  '"Done", "In progress" and "Blockers". Use a single LLM structured-output step.',
].join(' ');

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

// Streaming poll cadence and safety caps (cap * POLL_MS bounds the total wait per phase).
export const POLL_MS = 3000;
export const MAX_BUILD_TICKS = 400; // ~20 min
export const MAX_RETRO_TICKS = 100; // ~5 min

// Where Claude scaffolds the app inside the sandbox, and where it writes its retrospective.
export const APP_DIR = '/workspace/app';
export const RETRO_FILE = 'retro.json';
