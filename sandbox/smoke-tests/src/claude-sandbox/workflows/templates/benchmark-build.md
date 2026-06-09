You are benchmarking the Loopstack TypeScript framework by building a real automation from scratch.

TASK:
{{{task}}}

Steps:

1. Scaffold a fresh NestJS app in {{appDir}}: `npx -y @nestjs/cli@latest new app --package-manager npm --skip-git`.
2. Install Loopstack: `npm install @loopstack/loopstack-module` and configure it (LoopstackModule.forRoot()
   in app.module.ts, and add `"assets": ["**/*.yaml"]` to nest-cli.json's compilerOptions).
3. Implement the automation as a Loopstack workflow (plus any tools/documents it needs).
4. Make `npm run build` pass.
5. Write unit tests with `@loopstack/testing` and make `npm test` pass. Do NOT rely on Postgres or Redis —
   keep tests at the unit level so they run without external infrastructure.

Work autonomously until build and tests are green. When finished, print a short summary of what you built
and any friction you hit (wrong versions, missing peer dependencies, unclear docs, confusing errors).
