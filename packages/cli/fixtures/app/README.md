# Loopstack App

Scaffolded with `loopstack create`.

## Quickstart

```bash
docker compose up -d     # Postgres + Redis
npm run start:dev        # the backend on http://localhost:3000
```

Run the hello workflow from the terminal:

```bash
npx @loopstack/cli run hello --arg name=You
```

Prefer a visual UI? Start Studio (optional) and open [http://localhost:5173](http://localhost:5173):

```bash
docker compose -f docker-compose.studio.yml up -d
```

## Next steps

- Build your first workflow: https://loopstack.ai/docs
- Add feature modules and example workflows from the registry: https://loopstack.ai/registry
