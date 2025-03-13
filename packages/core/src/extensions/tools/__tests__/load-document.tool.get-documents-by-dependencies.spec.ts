import { Test, TestingModule } from '@nestjs/testing';
import {
  LoadDocumentArgsInterface,
  LoadDocumentTool,
} from '../load-document.tool';
import { DocumentService } from '../../../persistence/services/document.service';
import { FunctionCallService } from '../../../processor';
import { ProcessStateInterface } from '../../../processor/interfaces/process-state.interface';
import { DocumentEntity } from '../../../persistence/entities';
import { WorkflowEntity } from '../../../persistence/entities';

describe('LoadDocumentTool', () => {
  let loadDocumentTool: LoadDocumentTool;
  let documentService: DocumentService;
  let functionCallService: FunctionCallService;

  // Mock dependencies
  const mockDocumentService = {
    createDocumentsQuery: jest.fn(),
  };

  const mockFunctionCallService = {
    evaluate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoadDocumentTool,
        { provide: DocumentService, useValue: mockDocumentService },
        { provide: FunctionCallService, useValue: mockFunctionCallService },
      ],
    }).compile();

    loadDocumentTool = module.get<LoadDocumentTool>(LoadDocumentTool);
    documentService = module.get<DocumentService>(DocumentService);
    functionCallService = module.get<FunctionCallService>(FunctionCallService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('getDocumentsByDependencies', () => {
    it('should filter dependencies by name only when type is not provided', () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'TestDocument',
        where: {
          name: 'dependency1',
        },
      };

      const mockProcessState: Partial<ProcessStateInterface> = {
        workflow: {
          dependencies: [
            { name: 'dependency1', type: 'type1', id: '1' } as DocumentEntity,
            { name: 'dependency1', type: 'type2', id: '2' } as DocumentEntity,
            { name: 'dependency2', type: 'type1', id: '3' } as DocumentEntity,
          ],
        } as WorkflowEntity,
      };

      // Mock the applyFilters method
      jest.spyOn(loadDocumentTool as any, 'applyFilters').mockReturnValue([
        { name: 'dependency1', type: 'type1', id: '1' },
        { name: 'dependency1', type: 'type2', id: '2' },
      ]);

      // Act
      const result = loadDocumentTool.getDocumentsByDependencies(
        options,
        mockProcessState as ProcessStateInterface,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect((loadDocumentTool as any).applyFilters).toHaveBeenCalledWith(
        options,
        [
          { name: 'dependency1', type: 'type1', id: '1' },
          { name: 'dependency1', type: 'type2', id: '2' },
        ],
      );
    });

    it('should filter dependencies by both name and type when type is provided', () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'TestDocument',
        where: {
          name: 'dependency1',
          type: 'type1',
        },
      };

      const mockProcessState: Partial<ProcessStateInterface> = {
        workflow: {
          dependencies: [
            { name: 'dependency1', type: 'type1', id: '1' } as DocumentEntity,
            { name: 'dependency1', type: 'type2', id: '2' } as DocumentEntity,
            { name: 'dependency2', type: 'type1', id: '3' } as DocumentEntity,
          ],
        } as WorkflowEntity,
      };

      // Mock the applyFilters method
      jest
        .spyOn(loadDocumentTool as any, 'applyFilters')
        .mockReturnValue([{ name: 'dependency1', type: 'type1', id: '1' }]);

      // Act
      const result = loadDocumentTool.getDocumentsByDependencies(
        options,
        mockProcessState as ProcessStateInterface,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect((loadDocumentTool as any).applyFilters).toHaveBeenCalledWith(
        options,
        [{ name: 'dependency1', type: 'type1', id: '1' }],
      );
    });

    it('should return empty array when no matching dependencies found', () => {
      // Arrange
      const options: LoadDocumentArgsInterface = {
        name: 'TestDocument',
        where: {
          name: 'nonExistentDependency',
        },
      };

      const mockProcessState: Partial<ProcessStateInterface> = {
        workflow: {
          dependencies: [
            { name: 'dependency1', type: 'type1', id: '1' } as DocumentEntity,
            { name: 'dependency2', type: 'type2', id: '2' } as DocumentEntity,
          ],
        } as WorkflowEntity,
      };

      // Mock the applyFilters method
      jest.spyOn(loadDocumentTool as any, 'applyFilters').mockReturnValue([]);

      // Act
      const result = loadDocumentTool.getDocumentsByDependencies(
        options,
        mockProcessState as ProcessStateInterface,
      );

      // Assert
      expect(result).toHaveLength(0);
      expect((loadDocumentTool as any).applyFilters).toHaveBeenCalledWith(
        options,
        [],
      );
    });
  });
});
