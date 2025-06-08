import { createPipelineTestSetup } from './create-pipeline-test-setup';

describe('Example Tool Call Agent Example', () => {
  let testSetup: any;

  beforeAll(async () => {
    testSetup = await createPipelineTestSetup();
  });

  beforeEach(async () => {
    await testSetup.setupWorkspaceAndProject('examples', 'examples_toolCallAgent');
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should greet the user with their name', async () => {
    const result = await testSetup.processorService.processProject({
      userId: null,
      projectId: testSetup.context.project.id,
    });

    expect(result.model).toEqual('examples_toolCallAgent');

    const messages = await testSetup.documentService.createDocumentsQuery(
      testSetup.context.project.id,
      testSetup.context.workspace.id,
      {
        name: "core_message"
      }
    ).getMany();

    // a tool should have been called
    const toolMessage = messages.find((item) => item.content.role === 'tool');
    expect(toolMessage).toBeDefined();

    // last message should contain "Jakob"
    const lastMessage = messages[messages.length - 1]?.content;
    expect(lastMessage.role).toEqual('assistant');
    expect(lastMessage.content).toContain('Jakob');
  });
});
