# Loopstack AI

[//]: # '[![Version](https://img.shields.io/badge/version-alpha-orange)](https://github.com/loopstack-ai/loopstack/releases)'

[![Discord](https://img.shields.io/badge/discord-join%20community-7289da)](https://discord.gg/svAHrkxKZg)

A developer-first framework for reliable AI workflow automation that eliminates the complexity of building, testing, and deploying AI-powered applications.

Loopstack simplifies AI workflow automation by providing a declarative YAML-based approach to define complex AI operations. Instead of writing boilerplate code for AI integrations, prompt management, and workflow orchestration, you define your logic in configuration files and let Loopstack handle the execution.

It ships with a built-in frontend to execute and control your workflows while providing a well documented API and developer SDK for integration in your own applications.

## Getting started:

### Prerequisites

- Node.js 18.0+
- Docker
- Git

### Step 1: Install

```shell
npx create-loopstack-app my-project
```

### Step 2: Start Environment

```shell
cd my-project
docker compose up -d
```

### Step 3: Run your app

```shell
npm run start:dev
```

Congratulations, your application is now running at:

http://localhost:3000

### Optional: Running Frontend from source

#### Install

```shell
cd frontend/loopstack-studio
npm install
```

#### Start

```shell
npm run dev
```

The dev Environment of Loopstack Studio is running at:
http://localhost:5173

## Documentation

- 📖 **Documentation**: [https://loopstack.ai/docs](https://loopstack.ai/docs)

## Getting Help

- 💬 **Discord Community**: [https://discord.gg/loopstack](https://discord.gg/svAHrkxKZg)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/loopstack-ai/loopstack/issues)

## License

**Loopstack Core Modules** use the **Business Source License 1.1** (BSL):

- ✅ **Free for personal and commercial use** - build apps, modify code, sell products
- ❌ **No cloud service** - don't offer this software itself as a hosted service

We want you to use this software freely while we build a business that guarantees long term development and maintenance. After 4 years, everything becomes completely open source with no restrictions.

For details see: [LICENSE.md](LICENSE.md)

---

**Built with ❤️ by the Loopstack team**

[Website](https://loopstack.ai) • [Documentation](https://loopstack.ai/docs) • [GitHub](https://github.com/loopstack-ai/loopstack)
