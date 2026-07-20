---
'@loopstack/remote-server': patch
---

Bare local startup (`node dist/index.js` outside the docker image) no longer exits when PM2 is missing: the custom-app start is skipped when `/app/ecosystem.config.cjs` doesn't exist ("local mode" — the file/exec/git API serves normally). Fly machines and local docker-compose are unchanged, including the fail-fast exit when PM2 genuinely fails.
