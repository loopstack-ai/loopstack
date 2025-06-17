import { createPipelineTestSetup } from './utils/create-pipeline-test-setup';
import { ServiceRegistry } from '@loopstack/core';
import {
  mockServiceInRegistry,
  MockServiceInterface,
} from './utils/mock-service-registry';
import { createMockPromptResponse } from './utils/create-mock-llm-response';
import { TransitionPayloadInterface } from '@loopstack/shared';

describe('Chatbot Example', () => {
  let testSetup: any;
  let serviceRegistry: ServiceRegistry;
  let mockService: MockServiceInterface;

  beforeAll(async () => {
    testSetup = await createPipelineTestSetup();
    serviceRegistry = testSetup.app.get(ServiceRegistry);
  });

  beforeEach(async () => {
    await testSetup.setupWorkspaceAndPipeline('examples', 'examples_chatBot');
    jest.clearAllMocks();
    mockService = mockServiceInRegistry(
      serviceRegistry,
      'ExecutePromptMessagesService',
    );
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should handle a chat workflow', async () => {
    // Mock llm responses
    const response1 = createMockPromptResponse(
      'Hello! How can I assist you today?',
    );

    mockService.apply.mockResolvedValueOnce({
      success: true,
      data: { content: response1 },
    });

    // start with no messages
    const result = await testSetup.rootProcessorService.processRootPipeline(
      testSetup.context.pipeline,
      {},
    );

    expect(result.model).toEqual('examples_chatBot');

    const messages = await testSetup.documentService
      .createDocumentsQuery(
        testSetup.context.pipeline.id,
        testSetup.context.workspace.id,
        {
          name: 'core_chatMessage',
        },
      )
      .getMany();

    expect(messages.length).toEqual(0);

    // get the workflow
    const pipelineRelation = await testSetup.pipelineService.getPipeline(
      testSetup.context.pipeline.id,
      null,
    );
    const workflow = await testSetup.workflowService
      .createFindQuery(pipelineRelation.namespaces[0].id)
      .getOne();

    // user adds a message
    const transition1: TransitionPayloadInterface = {
      name: 'addUserMessage',
      workflowId: workflow.id,
      payload: 'Hi!',
    };

    await testSetup.rootProcessorService.processRootPipeline(
      testSetup.context.pipeline,
      {
        transition: transition1,
      },
    );

    const messages2 = await testSetup.documentService
      .createDocumentsQuery(
        testSetup.context.pipeline.id,
        testSetup.context.workspace.id,
        {
          name: 'core_chatMessage',
        },
      )
      .getMany();

    expect(messages2.length).toEqual(2);

    // should contain user message
    expect(messages2).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Hi!'),
          }),
        }),
      ]),
    );

    // should contain assistant response
    expect(messages2).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.objectContaining({
            role: 'assistant',
            content: expect.stringContaining(
              'Hello! How can I assist you today?',
            ),
          }),
        }),
      ]),
    );
  });
});
