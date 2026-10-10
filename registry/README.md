# Registry

Every directory here is one npm package. The directory name, the npm name and the docs page share it: `registry/<name>` is published as `@loopstack/<name>` and documented at `loopstack.ai/docs/registry/<name>`. Each package is a NestJS module you import into your app:

```bash
npm install @loopstack/<name>
```

Full overview with install and usage notes: [loopstack.ai/docs/registry](https://loopstack.ai/docs/registry). Each package's `README.md` is its documentation page.

## Packages

### LLM providers

| Package                         | What it adds                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`llm-provider`](llm-provider/) | Provider-agnostic LLM contracts, registry and the generic `llm_generate_text` tools; providers register themselves here |
| [`claude`](claude/)             | Anthropic Claude provider via the official SDK, with message storage and prompt caching                                 |
| [`openai`](openai/)             | OpenAI provider via the OpenAI SDK                                                                                      |
| [`claude-tools`](claude-tools/) | Claude-specific tools such as web search through Claude server tools                                                    |

### Agents and human-in-the-loop

| Package                     | What it adds                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`agent`](agent/)           | Generic agent workflow — configurable agent loop with tool calling, error handling and cancel support |
| [`code-agent`](code-agent/) | Codebase exploration agent built on `agent`                                                           |
| [`hitl`](hitl/)             | Human-in-the-loop — ask questions, present options and request confirmations during a run             |
| [`handoff`](handoff/)       | Hand-off documents that drive the Studio Handoff panel and the CLI terminal hand-off                  |

### Tools

| Package                                                   | What it adds                                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`mcp`](mcp/)                                             | List and call tools on remote MCP servers over Streamable HTTP                      |
| [`web`](web/)                                             | Fetch web content as Markdown, optionally summarized by the configured LLM provider |
| [`typesafe`](typesafe/)                                   | Typed yes/no, choice and score decisions about workflow state via TypeSafe AI       |
| [`git`](git/)                                             | Git tools and API for workspaces — commit, push, pull, branch, diff and more        |
| [`docker-sandbox`](docker-sandbox/)                       | Isolated Docker containers for running untrusted code                               |
| [`docker-sandbox-filesystem`](docker-sandbox-filesystem/) | Safe filesystem operations inside a Docker sandbox                                  |

### OAuth providers and integrations

| Package                                     | What it adds                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`oauth`](oauth/)                           | Provider-agnostic OAuth 2.0 — generic OAuth workflow, token storage and a provider registry |
| [`github`](github/)                         | GitHub OAuth provider and tools for repositories, issues, pull requests and actions         |
| [`google-workspace`](google-workspace/)     | Google OAuth provider and tools for Calendar, Drive and Gmail                               |
| [`github-integration`](github-integration/) | Connect a workspace to a GitHub repository — OAuth, push, pull and sync as one workflow     |

### Workspaces and runtime

| Package                             | What it adds                                                                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`remote-client`](remote-client/)   | HTTP client and tools for a remote workspace server — files, shell, app lifecycle. [`remote-client/server/`](remote-client/server/) holds `@loopstack/remote-server`, the server half of the same API (private, shipped as a Docker image) |
| [`code-workspace`](code-workspace/) | Isolated per-run checkouts from shared bases, in disposable Docker containers                                                                                                                                                              |
| [`claims`](claims/)                 | Resource claims — exclusive and pooled resources held by a run or a workspace                                                                                                                                                              |
| [`secrets`](secrets/)               | Workspace secrets — entity, service, tools and REST API                                                                                                                                                                                    |
| [`quota`](quota/)                   | Opt-in quota tracking and enforcement, Redis-backed                                                                                                                                                                                        |

### Studio surfaces

| Package                                         | What it adds                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| [`local-file-explorer`](local-file-explorer/)   | File tree and content browsing of the local filesystem in Studio      |
| [`remote-file-explorer`](remote-file-explorer/) | File tree and content browsing of a remote workspace server in Studio |

## Working on a package

Packages are npm workspaces of this repository and build with Turborepo. From the repository root:

```bash
npm install
npm run build                      # every package
npm test                           # every package
npm run build -w @loopstack/<name> # one package
```

Each package versions independently through [changesets](../.changeset/). A change to a package needs a changeset file naming it. `remote-client/server` is the one deployable here (it has a `Dockerfile`); every other directory is a plain library.

To read a package's source without cloning the repository:

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/<name> /tmp/<name>
```
