import {
  generateObjectFingerprint,
  HandlerCallResult,
  WorkflowEntity,
  WorkflowState,
} from '@loopstack/common';
import { INestApplication } from '@nestjs/common';
import {
  BlockFactory,
  ProcessorFactory,
  Workflow,
  WorkflowProcessorService,
} from '../workflow-processor';
import { cloneDeep } from 'lodash';
import { WorkflowExecutionContextDto } from '../common';
import { WorkflowService } from '../persistence';

type MockConfig = {
  tool: any;
  mockResolvedValues?: HandlerCallResult[] | undefined;
};

export const DEFAULT_WORKFLOW_ENTITY: Omit<WorkflowEntity, 'namespace'> = {
  id: '00000000-0000-0000-0000-000000000000',
  blockName: '',
  title: '',
  index: '1',
  progress: 0,
  status: WorkflowState.Pending,
  hasError: false,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  place: 'start',
  transitionResults: null,
  inputData: {},
  availableTransitions: null,
  history: null,
  schema: null,
  error: null,
  ui: null,
  namespaceId: '',
  pipelineId: '',
  labels: [],
  hashRecord: null,
  createdBy: '',
  documents: [],
  dependencies: [],
};

export class WorkflowTestBuilder<T extends Workflow> {
  private mocks: MockConfig[] = [];
  private workflowData: Partial<WorkflowEntity> = {};
  private contextData: Partial<WorkflowExecutionContextDto> = {};
  private blockArgs: any = {};
  private optionsHash: string | undefined;
  private workflowId: string = crypto.randomUUID();

  private app: INestApplication | null = null;
  private service: WorkflowProcessorService | null = null;
  private factory: ProcessorFactory | null = null;
  private blockFactory: BlockFactory | null = null;
  private module: any = null;
  private workflowService: WorkflowService | null = null;
  private mockSpies: jest.SpyInstance[] = [];
  private mockSpyMap = new Map<any, jest.SpyInstance>();
  private isSetup = false;
  private block: Workflow | null = null;

  constructor(
    private testModuleFactory: () => Promise<any>,
    private classRef: new (...args: any[]) => T,
  ) {}

  /**
   * Add a tool mock configuration
   */
  withToolMock(
    tool: any,
    resolvedReturnValues?: HandlerCallResult | HandlerCallResult[],
  ): this {
    const values =
      resolvedReturnValues === undefined || Array.isArray(resolvedReturnValues)
        ? resolvedReturnValues
        : [resolvedReturnValues];

    if (!tool) {
      throw new Error('Mock config must include a tool');
    }

    const config: MockConfig = {
      tool,
      mockResolvedValues: values,
    };

    this.mocks.push(config);
    return this;
  }

  /**
   * Set workflow data (should be workflow state not entity - marked as todo)
   */
  withWorkflowData(data: Partial<WorkflowEntity>): this {
    this.workflowData = data;
    return this;
  }

  /**
   * Set execution context data
   */
  withContext(context: Partial<WorkflowExecutionContextDto>): this {
    this.contextData = context;
    return this;
  }

  /**
   * Set workflow arguments
   */
  withArgs(args: any): this {
    this.blockArgs = args;
    this.optionsHash = generateObjectFingerprint(args);
    return this;
  }

  /**
   * Set workflow ID
   */
  withWorkflowId(id: string): this {
    this.workflowId = id;
    return this;
  }

  /**
   * Get a mock spy by tool class
   */
  getToolSpy(tool: any): jest.SpyInstance {
    const spy = this.mockSpyMap.get(tool);
    if (!spy) {
      throw new Error(
        `No mock spy found for tool: ${tool.name}. Did you forget to call withToolMock?`,
      );
    }
    return spy;
  }

  /**
   * Setup the test environment
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      throw new Error('Test builder already setup. Call teardown() first.');
    }

    this.setupMocks();
    await this.initializeModule();
    this.isSetup = true;
  }

  /**
   * Teardown the test environment
   */
  async teardown(): Promise<void> {
    if (!this.isSetup) {
      return; // Already torn down or never set up
    }

    this.restoreMocks();

    if (this.app) {
      await this.app.close();
      this.app = null;
    }

    if (this.module) {
      await this.module.close();
      this.module = null;
    }

    this.service = null;
    this.factory = null;
    this.blockFactory = null;
    this.workflowService = null;
    this.isSetup = false;
  }

  /**
   * Run the workflow and automatically handle setup/teardown
   */
  async run(): Promise<Workflow> {
    await this.setup();
    try {
      return await this.execute();
    } finally {
      await this.teardown();
    }
  }

  /**
   * Run a workflow with automatic setup/teardown and proper assertion timing
   */
  async runWorkflow(
    testFn: (result: T, builder: this) => void | Promise<void>,
  ): Promise<void> {
    await this.setup();
    try {
      const result = await this.execute();
      await testFn(result, this);
    } finally {
      await this.teardown();
    }
  }

  /**
   * Execute the workflow
   */
  async execute(
    overrideCtx?: Partial<WorkflowExecutionContextDto>,
  ): Promise<T> {
    if (!this.isSetup) {
      throw new Error(
        'Test builder not setup. Call setup() first or use run() or runTest().',
      );
    }

    const mockWorkflowEntity = cloneDeep({
      ...DEFAULT_WORKFLOW_ENTITY,
      ...{ id: this.workflowId ?? crypto.randomUUID() },
      ...(this.optionsHash
        ? { hashRecord: { options: this.optionsHash } }
        : {}),
      ...this.workflowData,
    });

    jest
      .spyOn(this.workflowService!, 'findOneByQuery')
      .mockResolvedValue(mockWorkflowEntity as any);
    jest
      .spyOn(this.workflowService!, 'save')
      .mockResolvedValue(mockWorkflowEntity as any);

    const ctx = new WorkflowExecutionContextDto({
      ...this.contextData,
      ...(overrideCtx ?? {}),
    } as unknown as WorkflowExecutionContextDto);

    this.block = await this.blockFactory!.createBlock<
      Workflow,
      WorkflowExecutionContextDto
    >(this.classRef.name, this.blockArgs, ctx);

    return (await this.service!.process(this.block, this.factory!)) as T;
  }

  private setupMocks(): void {
    this.mocks.forEach((mockConfig) => {
      const spy = jest.spyOn(mockConfig.tool.prototype, 'execute');

      if (mockConfig.mockResolvedValues !== undefined) {
        mockConfig.mockResolvedValues.forEach((value) => {
          spy.mockResolvedValueOnce(value);
        });
      }

      this.mockSpies.push(spy);
      this.mockSpyMap.set(mockConfig.tool, spy);
    });
  }

  private restoreMocks(): void {
    this.mockSpies.forEach((spy) => spy.mockRestore());
    this.mockSpies = [];
    this.mockSpyMap.clear();
    this.mocks = [];
  }

  private async initializeModule(): Promise<void> {
    this.module = await this.testModuleFactory();
    this.app = this.module.createNestApplication();
    await this.app?.init();

    this.service = this.module.get(WorkflowProcessorService);
    this.factory = this.module.get(ProcessorFactory);
    this.blockFactory = this.module.get(BlockFactory);
    this.workflowService = this.module.get(WorkflowService);
  }
}
