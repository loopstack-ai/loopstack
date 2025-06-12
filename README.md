# Loopstack AI

[![Version](https://img.shields.io/badge/version-v0.1--alpha-orange)](https://github.com/loopstack-ai/loopstack/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Discord](https://img.shields.io/badge/discord-join%20community-7289da)](https://discord.gg/wuXpv76p)

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

### Building custom workflows and tools

```yaml
#./src/config/examples/llm-completion-example/llm-completion-example.yaml

workflows:
  - name: examples_llmCompletion_workflow
    title: "LLM Completion"
    type: stateMachine
    transitions:

      - name: makeCompletionRequest
        from: start
        to: responseReceived
        call:
          - tool: examples_llmCompletion_createProfessionalEmail
            arguments:
              user_input: |
                hey john, can you send me those reports by tomorrow? thanks
            exportAs: PROMPT_RESULT

      - name: addResponseMessage
        from: responseReceived
        to: complete
        call:
          - tool: core_createChatMessage
            arguments:
              role: ${ PROMPT_RESULT.response.data.role }
              content: ${ PROMPT_RESULT.response.data.content }

tools:
  - name: examples_llmCompletion_createProfessionalEmail
    execute:
      service: LlmCompletionService
      arguments:
        llm:
          envApiKey: OPENAI_KEY
          model: gpt-4o
        messages:
          - role: system
            content: |
              You are a professional email writer. Transform the following casual message into a polished, professional email format.

              Casual Message: <%= arguments.user_input %>

              Please rewrite this as a professional email including:
                - Appropriate subject line
                - Professional greeting
                - Clear, courteous body text
                - Professional closing

              Professional Email:
pipelines:
  - name: examples_llmCompletion
    title: "Llm Completion Example"
    workspace: examples
    entrypoint: examples_llmCompletion_workflow
```

### Building custom services to invoke with tools

```typescript
// ./src/services/pdf-extractor.service.ts

import { Injectable } from '@nestjs/common';
import { Service, ServiceCallResult, ServiceInterface } from '@loopstack/shared';
import { z } from 'zod';
import * as pdfParse from 'pdf-parse';

const schema = z.object({
  filePath: z.string(),
});

@Injectable()
@Service({ schema })
export class PdfExtractorTool implements ServiceInterface {

  async apply(props: z.infer<typeof schema>): Promise<ServiceCallResult> {
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
  }

  private async readFile(filePath: string): Promise<Buffer> {
    // File reading implementation
    throw new Error('Not implemented.');
  }
}
```

### Write Test for your code and workflows

```typescript
// ./test/llm-completion-example.e2e-spec.ts

import { createPipelineTestSetup } from './utils/create-pipeline-test-setup';
import { ServiceRegistry } from '@loopstack/core';
import { mockServiceInRegistry, MockServiceInterface } from './utils/mock-service-registry';
import { createMockPromptResponse } from './utils/create-mock-llm-response';

describe('Llm Completion Example', () => {
  let testSetup: any;
  let serviceRegistry: ServiceRegistry;
  let mockService: MockServiceInterface;

  beforeAll(async () => {
    testSetup = await createPipelineTestSetup();
    serviceRegistry = testSetup.app.get(ServiceRegistry);
  });

  beforeEach(async () => {
    await testSetup.setupWorkspaceAndPipeline('examples', 'examples_llmCompletion');
    jest.clearAllMocks();
    mockService = mockServiceInRegistry(serviceRegistry, 'LlmCompletionService');
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should request the completion and output the response', async () => {

    // Mock llm response
    const completionResponse = createMockPromptResponse('Subject: Request for Reports by Tomorrow\\n\\nDear John,\\n\\nI hope this message finds you well. I am writing to kindly request if you could send me the reports by tomorrow. Your assistance in this matter would be greatly appreciated.\\n\\nThank you in advance for your cooperation.\\n\\nBest regards,\\n\\n[Your Name]');

    mockService.apply
      .mockResolvedValueOnce({ success: true, data: { content: completionResponse } });

    const result = await testSetup.processorService.processPipeline({
      userId: null,
      pipelineId: testSetup.context.pipeline.id,
    });

    expect(result.model).toEqual('examples_llmCompletion');

    const messages = await testSetup.documentService.createDocumentsQuery(
      testSetup.context.pipeline.id,
      testSetup.context.workspace.id,
      {
        name: "core_chatMessage"
      }
    ).getMany();

    // Verify LLM completion was called with user input
    expect(mockService.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('hey john')
          })
        ])
      }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    // Verify message is created
    const lastMessage = messages[messages.length - 1]?.content;
    expect(lastMessage.role).toEqual('assistant');
    expect(lastMessage.content).toContain('Request for Reports by Tomorrow');

  });
});
```

## Getting Help

- 📖 **Documentation**: [https://loopstack.ai/docs](https://loopstack.ai/docs)
- 💬 **Discord Community**: [https://discord.gg/loopstack](https://discord.gg/wuXpv76p)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/loopstack-ai/loopstack/issues)

## Contributing

We're actively preparing Loopstack for full open-source contribution! While we finalize the release of all modules, you can help by:

- 🐛 [Reporting bugs and issues](https://github.com/loopstack-ai/loopstack/issues)
- 💡 [Suggesting features and improvements](https://github.com/loopstack-ai/loopstack/discussions)
- 📖 Improving documentation
- 💬 Joining our [Discord community](https://discord.gg/wuXpv76p) to share feedback

**Coming soon**: Full source code access, contribution guidelines, and developer onboarding docs.

[→ Follow our progress](https://github.com/loopstack-ai/loopstack)

## License
MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the Loopstack team**

[Website](https://loopstack.ai) • [Documentation](https://loopstack.ai/docs) • [GitHub](https://github.com/loopstack-ai/loopstack)
