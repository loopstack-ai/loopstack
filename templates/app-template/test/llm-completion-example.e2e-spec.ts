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
        name: "core_message"
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
