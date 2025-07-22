# Loopstack AI

[![Version](https://img.shields.io/badge/version-v0.1--alpha-orange)](https://github.com/loopstack-ai/loopstack/releases)
[![Discord](https://img.shields.io/badge/discord-join%20community-7289da)](https://discord.gg/svAHrkxKZg)

A developer-first, open-source framework for reliable AI workflow automation that eliminates the complexity of building, testing, and deploying AI-powered applications.

Loopstack is build on Typescript / NestJs Framework, leveraging a convenient yet powerful declarative approach to build AI automation flows.

## Table of Contents

- [What is Loopstack?](#what-is-loopstack)
- [Key Features](#key-features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Building with Loopstack](#building-with-loopstack)
- [Contributing](#contributing)
- [License](#license)

## What is Loopstack?

Loopstack simplifies AI workflow automation by providing a declarative YAML-based approach to define complex AI operations. Instead of writing boilerplate code for AI integrations, prompt management, and workflow orchestration, you define your logic in configuration files and let Loopstack handle the execution.

It ships with a built-in frontend to execute and control your workflows while providing a well documented API and developer SDK for integration in your own applications.

**Perfect for**: Document processing pipelines, content generation workflows, data analysis automation, and multi-step AI operations that require reliable execution and human control.

## Key Features

- **🚀 Zero-config Setup** - Start building AI workflows in minutes
- **📝 Declarative Workflows** - Define complex AI operations using simple YAML configuration
- **🔧 Built-in Studio** - Visual interface for executing and interacting with workflows
- **🔌 Extensible Architecture** - Custom tools and integrations with TypeScript
- **📊 Production Ready** - Built-in error handling, retries, and observability
- **🧪 Testing Framework** - End-to-end testing support for AI workflows
- **📚 Developer SDK** - Well-documented API for integration with existing applications

## Prerequisites

- Node.js 18.0+
- Docker
- Git

## Getting started:
### Step 1: Create a loopstack starter application

```
npx create-loopstack-app my-project
```

### Step 2: Configure Your Environment
```
cd my-project
cp .env.example .env

# Edit .env with your API keys (OpenAI, Anthropic, etc.)
```

### Step 3: Start the dev environment

```
docker compose up -d
```
This starts the following services:

- PostgreSQL (port 5432) - workflow state and document storage
- Redis (port 6379) - pub/sub and caching
- Websocket Server (port 8001) - live messaging
- Loopstack Studio (port 3000) - workflow user interface

### Step 4: Run your app
```
npm run start:dev
```
Your application is now running at:

http://localhost:3000

### Optional: enable schema validation in your IDE

For yaml file validation in your IDE, generate and link your custom JSON schema.
```
npm run generate:schema
```

Then, configure your IDE to use your custom schema for YAML validation: `./src/generated/main.schema.json`

Remember, to re-generate the schema when you add tools or modify their input schemas.

## Tech Stack

- Backend: Node.js / NestJS
- Frontend: React.js / Vite
- Workflows: YAML + TypeScript
- Database: PostgreSQL
- Cache: Redis
- Containerization: Docker

## Building with Loopstack

For detailed documentation, visit https://loopstack.ai/docs

## Getting Help

- 📖 **Documentation**: [https://loopstack.ai/docs](https://loopstack.ai/docs)
- 💬 **Discord Community**: [https://discord.gg/loopstack](https://discord.gg/svAHrkxKZg)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/loopstack-ai/loopstack/issues)

## Contributing

We're actively preparing Loopstack for full open-source contribution! While we finalize the release of all modules, you can help by:

- 🐛 [Reporting bugs and issues](https://github.com/loopstack-ai/loopstack/issues)
- 💡 [Suggesting features and improvements](https://github.com/loopstack-ai/loopstack/discussions)
- 📖 Improving documentation
- 💬 Joining our [Discord community](https://discord.gg/svAHrkxKZg) to share feedback

**Coming soon**: Full source code access, contribution guidelines, and developer onboarding docs.

---

**Built with ❤️ by the Loopstack team**

[Website](https://loopstack.ai) • [Documentation](https://loopstack.ai/docs) • [GitHub](https://github.com/loopstack-ai/loopstack)
