import { createPipelineTestSetup } from './utils/create-pipeline-test-setup';

describe('Tool Sequence Example', () => {
  let testSetup: any;

  beforeAll(async () => {
    testSetup = await createPipelineTestSetup();
  });

  beforeEach(async () => {
    await testSetup.setupWorkspaceAndPipeline('examples', 'examples_toolCallSequence');
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should call tools', async () => {
    const result = await testSetup.processorService.processPipeline({
      userId: null,
      pipelineId: testSetup.context.pipeline.id,
    });

    expect(result.model).toEqual('examples_toolCallSequence');

    const messages = await testSetup.documentService.createDocumentsQuery(
      testSetup.context.pipeline.id,
      testSetup.context.workspace.id,
      {
        name: "core_chatMessage"
      }
    ).getMany();

    expect(messages.length).toEqual(2);
  });
});
