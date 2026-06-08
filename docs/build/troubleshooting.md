---
title: Troubleshooting
description: Solutions to common Loopstack setup and runtime issues — YAML assets missing at runtime, Studio not connecting to the backend, and wait transitions that never fire.
---

# Troubleshooting

## YAML widget file not found at runtime

**Symptom:** Your workflow starts but throws an error like `ENOENT: no such file or directory` referencing a `.yaml` file, or Studio shows no UI widgets.

**Cause:** NestJS's TypeScript compiler strips non-TS files during build. YAML files are not copied to `dist/` unless explicitly configured.

**Fix:** Add a YAML assets rule to `nest-cli.json`:

```json
{
  "compilerOptions": {
    "assets": ["**/*.yaml"]
  }
}
```

Then restart the dev server (`npm run start:dev`) — NestJS watches and copies asset files on change.

**Also check:** The path passed to `widget:` or `this.render()` uses `__dirname`, which resolves to the compiled file's location in `dist/`. Make sure you're using:

```typescript
@Document({
  widget: __dirname + '/my-document.yaml',
})
```

Not a hardcoded path like `'src/my-feature/my-document.yaml'`.

---

## Studio shows blank or can't reach the backend

**Symptom:** Opening `http://localhost:5173` shows an empty screen, a connection error, or no workflows/runs appear.

**Cause:** Studio is a static web app that connects to your NestJS backend via the `VITE_API_URL` environment variable. If it's not set, it defaults to `http://localhost:3000`. If your backend is on a different port or host, Studio can't find it.

**Fix:** Set `VITE_API_URL` in your `.env` file before starting the Docker Compose stack:

```dotenv
VITE_API_URL=http://localhost:3000
```

If you changed the NestJS default port (e.g. via `app.listen(8080)`), update `VITE_API_URL` to match.

After changing `.env`, restart the stack:

```shell
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml down
docker compose -f node_modules/@loopstack/loopstack-module/docker-compose.yml up -d
```

---

## `wait: true` transition never fires when clicking a button

**Symptom:** You click a button in Studio and nothing happens — the workflow stays paused and doesn't advance.

**Cause:** The `transition:` value in your YAML widget config must exactly match the **method name** of the `wait: true` transition in your workflow class. If there's any mismatch (typo, different casing), Studio sends the trigger but the engine can't find the transition.

**Fix:** Make sure the names match exactly.

In your document YAML:

```yaml
actions:
  - type: button
    transition: confirm # ← must match the method name
    label: Confirm
```

In your workflow:

```typescript
@Transition({ from: 'reviewing', to: 'end', wait: true })
async confirm(state: MyState, payload: unknown): Promise<unknown> {
  //     ↑ must match the transition: value above
}
```

The same applies to `prompt-input` widgets:

```yaml
widget: prompt-input
options:
  transition: userMessage # ← must match the method name
```
