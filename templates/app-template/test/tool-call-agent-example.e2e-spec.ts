import { createPipelineTestSetup } from './utils/create-pipeline-test-setup';
import { ServiceRegistry } from '@loopstack/core';
import { mockServiceInRegistry, MockServiceInterface } from './utils/mock-service-registry';
import { createMockPromptResponse } from './utils/create-mock-llm-response';

describe('Tool Call Agent Example', () => {
  let testSetup: any;
  let serviceRegistry: ServiceRegistry;
  let mockService: MockServiceInterface;

  beforeAll(async () => {
    testSetup = await createPipelineTestSetup();
    serviceRegistry = testSetup.app.get(ServiceRegistry);
  });

  beforeEach(async () => {
    await testSetup.setupWorkspaceAndPipeline('examples', 'examples_toolCallAgent');
    jest.clearAllMocks();
    mockService = mockServiceInRegistry(serviceRegistry, 'ExecutePromptMessagesService');
  });

  afterEach(async () => {
    await testSetup.cleanup();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should greet the user with their name', async () => {

    // Mock first response with tool call
    const toolCallResponse = createMockPromptResponse(null, [{
      id: 'call_znFV5FuwTbJ2NlQHXguniDRM',
      type: 'function',
      function: {
        name: "examples_toolCallAgent_getUserName",
        arguments: JSON.stringify({ userId: '12345' }),
      }
    }]);

    // Mock final response with greeting
    const finalResponse = createMockPromptResponse('Hello Jakob.');

    mockService.apply
      .mockResolvedValueOnce({ success: true, data: { content: toolCallResponse } })
      .mockResolvedValueOnce({ success: true, data: { content: finalResponse } });

    const result = await testSetup.processorService.processPipeline({
      userId: null,
      pipelineId: testSetup.context.pipeline.id,
    });

    expect(result.model).toEqual('examples_toolCallAgent');

    const messages = await testSetup.documentService.createDocumentsQuery(
      testSetup.context.pipeline.id,
      testSetup.context.workspace.id,
      {
        name: "core_message"
      }
    ).getMany();

    // Verify tool was called
    const toolMessage = messages.find((item) => item.content.role === 'tool');
    expect(toolMessage).toBeDefined();
    expect(toolMessage.content.tool_call_id).toEqual('call_znFV5FuwTbJ2NlQHXguniDRM');
    expect(toolMessage.content.content).toContain('Jakob');

    // Verify final message contains user's name
    const lastMessage = messages[messages.length - 1]?.content;
    expect(lastMessage.role).toEqual('assistant');
    expect(lastMessage.content).toContain('Jakob');

    // Verify two LLM calls were made
    expect(mockService.apply).toHaveBeenCalledTimes(2);
  });
});
