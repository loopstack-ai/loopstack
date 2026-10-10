---
title: Documentation Sources
description: Map of the loopstack/docs/ folder — learn, build, extend, reference, registry, skills and tutorials — and how the website and llms.txt are generated from it.
---

# Documentation

These files are the source of [loopstack.ai/docs](https://loopstack.ai/docs). The website reads them in place; there is no copy and no sync step. `llms.txt` and `llms-full.txt` are generated from the same files, section by section.

| Folder                     | What is in it                                                                                                                                                                          | On the website                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`learn/`](learn/)         | What Loopstack is, the workflow engine, core concepts, the document store, Studio                                                                                                      | [/docs/learn](https://loopstack.ai/docs/learn/introduction)                  |
| [`build/`](build/)         | Getting started, adding Loopstack to an existing app, workflow fundamentals, AI and LLM calls, workflow patterns, integrations, testing, troubleshooting                               | [/docs/build](https://loopstack.ai/docs/build/getting-started)               |
| [`extend/`](extend/)       | Extension points: custom bootstrap, Studio features, LLM providers, OAuth providers, tool interceptors                                                                                 | [/docs/extend](https://loopstack.ai/docs/extend/llm-providers)               |
| [`reference/`](reference/) | CLI, client SDK, React adapter, configuration, workflow and document YAML, prompt selection rules, import paths, and the generated API reference in [`reference/api/`](reference/api/) | [/docs/reference](https://loopstack.ai/docs/reference/cli)                   |
| [`registry/`](registry/)   | The registry overview — every `@loopstack/*` package grouped by what it adds                                                                                                           | [/docs/registry](https://loopstack.ai/docs/registry)                         |
| [`skills/`](skills/)       | Instructions written for coding agents: create a workflow, a tool, a document; use core tools; use the registry                                                                        | [/docs/skills](https://loopstack.ai/docs/skills/create-custom-workflow)      |
| [`tutorials/`](tutorials/) | End-to-end walkthroughs: a chat agent with tools, a human-in-the-loop approval workflow                                                                                                | [/docs/tutorials](https://loopstack.ai/docs/tutorials/chat-agent-with-tools) |

Two more sources live outside this folder and appear under `/docs` as well: each registry package's `README.md` (`registry/<name>/README.md` → `/docs/registry/<name>`) and each example module's `README.md` (`examples/src/<module>/README.md` → `/docs/examples/<module>`).

## Conventions

- Every file has YAML frontmatter with `title` and `description`. The description is written for `llms.txt`: keyword-dense, naming the classes and methods the page covers, so an agent can decide whether to fetch it.
- The first paragraph after the heading is for human readers — it sets the context and motivates the topic.
- `reference/api/` is generated: `npm run api-reference` in the repository root rebuilds it from `@public` JSDoc. Do not edit those files by hand.
- `llms.json` declares the sections, their order and which of them `llms.txt` and `llms-full.txt` include.

## Building the website

```bash
cd website
npm run build
```

The build regenerates `llms.txt`, validates every internal link and checks every anchor. A link to a page or heading that does not exist fails the build.
