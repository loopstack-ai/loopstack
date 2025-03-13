import { Test, TestingModule } from '@nestjs/testing';
import {
  LoadDocumentArgsInterface,
  LoadDocumentTool,
} from '../load-document.tool';
import { DocumentService } from '../../../persistence/services/document.service';
import { FunctionCallService } from '../../../processor';
import { ProcessStateInterface } from '../../../processor/interfaces/process-state.interface';
import { DocumentEntity } from '../../../persistence/entities';

describe('LoadDocumentTool', () => {
  let loadDocumentTool: LoadDocumentTool;
  let documentService: DocumentService;
  let functionCallService: FunctionCallService;

  // Mock data
  const mockProjectId = 'project-123';
  const mockWorkspaceId = 'workspace-456';
  const mockWorkflowIndex = 5;

  const mockDocuments: DocumentEntity[] = [
    {
      id: 'doc1',
      name: 'Document 1',
      type: 'text',
      content: 'content1',
    } as unknown as DocumentEntity,
    {
      id: 'doc2',
      name: 'Document 2',
      type: 'text',
      content: 'content2',
    } as unknown as DocumentEntity,
    {
      id: 'doc3',
      name: 'Document 3',
      type: 'pdf',
      content: 'content3',
    } as unknown as DocumentEntity,
  ];

  // Mock query builder
  const mockQueryBuilder = {
    getOne: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoadDocumentTool,
        {
          provide: DocumentService,
          useValue: {
            createDocumentsQuery: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: FunctionCallService,
          useValue: {
            // Add any methods from FunctionCallService that might be used
          },
        },
      ],
    }).compile();

    loadDocumentTool = module.get<LoadDocumentTool>(LoadDocumentTool);
    documentService = module.get<DocumentService>(DocumentService);
    functionCallService = module.get<FunctionCallService>(FunctionCallService);

    // Setup prototype method for testing filters
    loadDocumentTool.applyFilters = jest
      .fn()
      .mockImplementation((options, docs) => docs);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocumentsByQuery', () => {
    const mockProcessState: ProcessStateInterface = {
      context: {
        projectId: mockProjectId,
        workspaceId: mockWorkspaceId,
        namespaces: { test: 1 },
      },
      workflow: {
        index: mockWorkflowIndex,
      },
    } as unknown as ProcessStateInterface;

    it('should call createQuery with correct parameters', async () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'Test Load',
        where: { name: 'Document 1' },
        many: false,
      };
      mockQueryBuilder.getOne.mockResolvedValue(mockDocuments[0]);

      // Act
      await loadDocumentTool.getDocumentsByQuery(options, mockProcessState);

      // Assert
      expect(documentService.createDocumentsQuery).toHaveBeenCalledWith(
        mockProjectId,
        mockWorkspaceId,
        options.where,
        {
          isGlobal: false,
          namespaces: undefined,
          ltWorkflowIndex: mockWorkflowIndex,
        },
      );
    });

    it('should use getOne when many is false', async () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'Test Load',
        where: { name: 'Document 1' },
        many: false,
      };
      mockQueryBuilder.getOne.mockResolvedValue(mockDocuments[0]);

      // Act
      const result = await loadDocumentTool.getDocumentsByQuery(
        options,
        mockProcessState,
      );

      // Assert
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).not.toHaveBeenCalled();
      expect(result).toEqual([mockDocuments[0]]);
    });

    it('should use getMany when many is true', async () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'Test Load',
        where: { name: 'Document' },
        many: true,
      };
      mockQueryBuilder.getMany.mockResolvedValue(mockDocuments);

      // Act
      const result = await loadDocumentTool.getDocumentsByQuery(
        options,
        mockProcessState,
      );

      // Assert
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(mockQueryBuilder.getOne).not.toHaveBeenCalled();
      expect(result).toEqual(mockDocuments);
    });

    it('should filter out null documents when getOne returns null', async () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'Test Load',
        where: { name: 'Non-existent Document' },
        many: false,
      };
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act
      const result = await loadDocumentTool.getDocumentsByQuery(
        options,
        mockProcessState,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it('should apply global flag when specified', async () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'Test Load',
        where: { name: 'Document 1' },
        global: true,
        many: false,
      };
      mockQueryBuilder.getOne.mockResolvedValue(mockDocuments[0]);

      // Act
      await loadDocumentTool.getDocumentsByQuery(options, mockProcessState);

      // Assert
      expect(documentService.createDocumentsQuery).toHaveBeenCalledWith(
        mockProjectId,
        mockWorkspaceId,
        options.where,
        expect.objectContaining({
          isGlobal: true,
        }),
      );
    });

    it('should pass namespaces to query options', async () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'Test Load',
        where: { name: 'Document 1' },
        labels: ['uuid1'],
        many: false,
      };
      mockQueryBuilder.getOne.mockResolvedValue(mockDocuments[0]);

      // Act
      await loadDocumentTool.getDocumentsByQuery(options, mockProcessState);

      // Assert
      expect(documentService.createDocumentsQuery).toHaveBeenCalledWith(
        mockProjectId,
        mockWorkspaceId,
        options.where,
        expect.objectContaining({
          labels: ['uuid1'],
        }),
      );
    });

    it('should call applyFilters with options and documents', async () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'Test Load',
        where: { name: 'Document' },
        many: true,
        filter: 'doc.type === "text"',
      };
      mockQueryBuilder.getMany.mockResolvedValue(mockDocuments);

      // Act
      await loadDocumentTool.getDocumentsByQuery(options, mockProcessState);

      // Assert
      expect(loadDocumentTool.applyFilters).toHaveBeenCalledWith(
        options,
        mockDocuments,
      );
    });
  });
});
