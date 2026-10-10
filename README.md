# Loopstack

A TypeScript framework for building AI agents and workflows in NestJS backends.

[Documentation](https://loopstack.ai/docs) · [Discord](https://discord.gg/svAHrkxKZg)

---

## Getting started

Requires Node.js 20.19 or later. The scaffold includes a Docker environment including Postgres and Redis servers.

```shell
npx @loopstack/cli create my-app
cd my-app
docker compose up -d
npm run start:dev
```

Then run:

```shell
npx @loopstack/cli run hello --arg name=You
```

To add Loopstack to an existing NestJS project, see our guide here: [Add to an Existing App](https://loopstack.ai/docs/build/add-to-existing-app).

---

## A simple Workflow

A workflow is a state machine. Each transition is a method that can call tools, call an LLM, run an agent or another workflow, or wait for a human. Tools are injectable services. Documents are typed data that Studio and the CLI render.

```typescript
@Workflow()
export class ReviewWorkflow extends BaseWorkflow<{ articleId: string }> {
  constructor(
    private readonly llm: LlmGenerateTextTool,
    private readonly notify: NotifyTool,
    private readonly repository: ArticleRepository,
  ) {
    super();
  }

  @Transition({
    from: 'start',
    to: 'loaded',
  })
  async load(state, ctx) {
    const article = await this.repository.findOneBy({ id: ctx.args.articleId });
    if (!article) {
      throw new Error(`Article ${ctx.args.articleId} not found.`);
    }
    this.assignState({ article });
  }

  @Transition({
    from: 'loaded',
    to: 'waiting',
  })
  async review(state) {
    const result = await this.llm.call({
      prompt: `Summarize this text: ${state.article.text}`,
    });
    await this.documentStore.save(ApprovalDocument, {
      text: result.data.message.text,
    });
  }

  @Transition({
    from: 'waiting',
    to: 'end',
    wait: true,
  })
  async notify(state, input) {
    await this.notify.call({
      message: `Article ${state.article.id} ${input.data.approved ? 'approved' : 'rejected'}.`,
    });
  }
}
```

The run stops at `waiting`. Studio and the CLI render the document with an approval button, waiting for the user's answer.

---

## Run it where you need it

Run a workflow via CLI, Browser or from code.

**Run via CLI**

```shell
loopstack run review --arg articleId=42
```

**Start the loopstack studio in the browser**

```shell
docker compose -f docker-compose.studio.yml up -d      # Studio on http://localhost:5173
```

**Execute from code**

```typescript
await this.workflowRunner.run(ReviewWorkflow, { articleId: '42' }, { appName: 'reviews', userId });
```

---

## Learn more

- [/docs](docs/README.md)
- [/examples](examples/README.md)
- [/registry](registry/README.md)
- [Visit our Website](https://loopstack.ai)

---

**Build for AI by the Loopstack Team**

[Website](https://loopstack.ai) · [Documentation](https://loopstack.ai/docs) · [GitHub](https://github.com/loopstack-ai/loopstack)
