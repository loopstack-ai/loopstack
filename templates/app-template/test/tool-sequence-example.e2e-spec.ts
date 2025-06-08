import { createPipelineTestSetup } from './create-pipeline-test-setup';

describe('Example Tool Sequence Example', () => {
  let testSetup: any;

  beforeAll(async () => {
    testSetup = await createPipelineTestSetup();
  });

  beforeEach(async () => {
    await testSetup.setupWorkspaceAndProject('examples', 'examples_toolCallSequence');
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should call tools', async () => {
    const result = await testSetup.processorService.processProject({
      userId: null,
      projectId: testSetup.context.project.id,
    });

    expect(result.model).toEqual('examples_toolCallSequence');

    const messages = await testSetup.documentService.createDocumentsQuery(
      testSetup.context.project.id,
      testSetup.context.workspace.id,
      {
        name: "core_message"
      }
    ).getMany();

    expect(messages.length).toEqual(2);
  });
});
