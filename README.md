# Loopstack AI

[![Version](https://img.shields.io/badge/version-v0.1.0--alpha-orange)](https://github.com/loopstack-ai/loopstack/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Discord](https://img.shields.io/badge/discord-join%20community-7289da)](https://discord.gg/loopstack)

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
- Docker & Docker Compose
- npm or yarn
- git

## Getting started:
### Step 1: Create a loopstack starter application

```
npx create-loopstack-app my-project
```

### Step 2: Start the dev environment

```
cd my-project
docker compose up -d
```
This starts the following services:

- PostgreSQL (port 5432) - workflow state and document storage
- Redis (port 6379) - pub/sub and caching
- Websocket Server (port 8001) - live messaging
- Loopstack Studio (port 3000) - workflow user interface

### Step 3: Configure Your Environment
```
cp .env.example .env
# Edit .env with your API keys (OpenAI, Anthropic, etc.)
```

### Step 4: Run your app
```
npm run start:dev
```
Your application is now running at:

- API: http://localhost:8000
- Websocket: http://localhost:8001
- Studio: http://localhost:3000
- API Documentation: http://localhost:8000/api

## Tech Stack

- Backend: Node.js / NestJS
- Frontend: React.js / Vite
- Workflows: YAML + TypeScript
- Database: PostgreSQL
- Cache: Redis
- Containerization: Docker

## Building with Loopstack

For detailed documentation, visit https://loopstack.ai/docs

### Building custom workflows and tools

```yaml
#./src/config/my-summarizer.yaml
workflows:
  - name: helloWorldWorkflow
    type: stateMachine
    transitions:
      - name: loadDocument
        from: start
        to: documentLoaded
      - name: summarizeContent
        from: documentLoaded
        to: finished
    handlers:
      - onTransition: loadDocument
        call: helloWorldDocumentLoader
        provideAs: CONTENT
      - onTransition: summarizeContent
        call: documentSummarizerPrompt
tools:
  - name: documentSummarizerPrompt
    service: SimplePromptService
    props:
      adapter: gpt-4o-adapter
      messages:
        - role: system
          content: "You are an expert document analyzer."
        - role: user
          content: |
            Analyze this document and provide a summary:

            Document Content:
            <%= CONTENT %>

            Focus on key insights, important details, and actionable items.
```

### Building custom tools

```typescript
// ./src/tools/pdf-extractor.tool.ts
import { Injectable } from '@nestjs/common';
import { ToolResult, ToolInterface, Tool } from '@loopstack/shared';
import * as pdfParse from 'pdf-parse';

interface PdfExtractorInput {
  filePath: string;
  extractImages?: boolean;
}

interface PdfExtractorOutput {
  text: string;
  pageCount: number;
  metadata: any;
}

@Injectable()
@Tool({
  name: 'pdfExtractor',
  description: 'Extract text content from PDF files',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: { type: 'string' },
      extractImages: { type: 'boolean', default: false }
    },
    required: ['filePath']
  }
})
export class PdfExtractorTool implements ToolInterface {

  async apply(input: PdfExtractorInput): Promise<ToolResult<PdfExtractorOutput>> {
    try {
      const buffer = await this.readFile(input.filePath);
      const data = await pdfParse(buffer);

      return {
        success: true,
        data: {
          text: data.text,
          pageCount: data.numpages,
          metadata: data.info
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract PDF: ${error.message}`
      };
    }
  }

  private async readFile(filePath: string): Promise<Buffer> {
    // File reading implementation
    throw new Error('Implementation needed');
  }
}
```


### Write Test for your code and workflows

```typescript
// ./src/test/document-processor.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from '@loopstack/core';
import { AppModule } from '../app.module';

describe('Document Processor Workflow E2E', () => {
  let app: TestingModule;
  let workflowService: WorkflowService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    workflowService = app.get<WorkflowService>(WorkflowService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process a document and return insights', async () => {
    const result = await workflowService.execute('documentProcessorWorkflow', {
      document: './test/fixtures/sample-document.pdf',
      analysisType: 'executive'
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('text');
    expect(result.data).toHaveProperty('summary');
    expect(result.data.summary).toContain('key insights');
  });

  it('should handle invalid document gracefully', async () => {
    const result = await workflowService.execute('documentProcessorWorkflow', {
      document: './test/fixtures/invalid-file.txt',
      analysisType: 'detailed'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to extract');
  });
});
```
### Getting Help

- 📖 **Documentation**: [https://loopstack.ai/docs](https://loopstack.ai/docs)
- 💬 **Discord Community**: [https://discord.gg/loopstack](https://discord.gg/loopstack)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/loopstack-ai/loopstack/issues)
- 📧 **Support Email**: support@loopstack.ai

## Contributing

We're actively preparing Loopstack for full open-source contribution! While we finalize the release of all modules, you can help by:

- 🐛 [Reporting bugs and issues](https://github.com/loopstack-ai/loopstack/issues)
- 💡 [Suggesting features and improvements](https://github.com/loopstack-ai/loopstack/discussions)
- 📖 Improving documentation
- 💬 Joining our [Discord community](https://discord.gg/loopstack) to share feedback

**Coming soon**: Full source code access, contribution guidelines, and developer onboarding docs.

[Follow our progress →](https://github.com/loopstack-ai/loopstack)

## License
MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v0.1.0 (Current)
- Initial release
---

**Built with ❤️ by the Loopstack team**

[Website](https://loopstack.ai) • [Documentation](https://loopstack.ai/docs) • [GitHub](https://github.com/loopstack-ai/loopstack)
