import { createPipelineTestSetup } from './utils/create-pipeline-test-setup';

describe('Error Handling Example', () => {
  let testSetup: any;

  beforeAll(async () => {
    testSetup = await createPipelineTestSetup();
  });

  beforeEach(async () => {
    await testSetup.setupWorkspaceAndPipeline(
      'examples',
      'examples_errorHandling',
    );
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should handle error gracefully', async () => {
    const result = await testSetup.rootProcessorService.processRootPipeline(
      testSetup.context.pipeline,
      {},
    );

    expect(result.model).toEqual('examples_errorHandling');

    const messages = await testSetup.documentService
      .createDocumentsQuery(
        testSetup.context.pipeline.id,
        testSetup.context.workspace.id,
        {
          name: 'core_errorMessage',
        },
      )
      .getMany();

    expect(messages[0].content.message).toContain('error');
  });
});
