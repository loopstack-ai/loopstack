import { APP_DIR, RETRO_FILE } from './benchmark.constants';

/** Instructs Claude to build, fix and test a Loopstack automation from scratch. */
export function buildPrompt(task: string): string {
  return [
    'You are benchmarking the Loopstack TypeScript framework by building a real automation from scratch.',
    '',
    'TASK:',
    task,
    '',
    'Steps:',
    `1. Scaffold a fresh NestJS app in ${APP_DIR}: \`npx -y @nestjs/cli@latest new app --package-manager npm --skip-git\`.`,
    '2. Install Loopstack: `npm install @loopstack/loopstack-module` and configure it (LoopstackModule.forRoot()',
    '   in app.module.ts, and add `"assets": ["**/*.yaml"]` to nest-cli.json\'s compilerOptions).',
    '3. Implement the automation as a Loopstack workflow (plus any tools/documents it needs).',
    '4. Make `npm run build` pass.',
    '5. Write unit tests with `@loopstack/testing` and make `npm test` pass. Do NOT rely on Postgres or Redis —',
    '   keep tests at the unit level so they run without external infrastructure.',
    '',
    'Work autonomously until build and tests are green. When finished, print a short summary of what you built',
    'and any friction you hit (wrong versions, missing peer dependencies, unclear docs, confusing errors).',
  ].join('\n');
}

/** Instructs Claude (resuming the build session) to write a structured retrospective to a file. */
export function retroPrompt(): string {
  return [
    'Now write an honest retrospective of building that automation with Loopstack.',
    'Reflect on the whole session: onboarding/scaffolding, the API, documentation, and error messages.',
    '',
    `Write the retrospective as JSON to the file /workspace/${RETRO_FILE} with EXACTLY this shape:`,
    '{',
    '  "wentWell": ["..."],',
    '  "wentBadly": ["..."],',
    '  "improvements": [{ "kind": "docs" | "code" | "dx", "suggestion": "..." }]',
    '}',
    '',
    'Be specific and concrete (e.g. name the package/version/peer-dependency or the exact doc that was missing).',
    'Output only after the file is written; the file content is what we read.',
  ].join('\n');
}
