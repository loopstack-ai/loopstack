import { Test, TestingModule } from '@nestjs/testing';
import { LoadDocumentTool } from '../load-document.tool';
import { DocumentService } from '../../../persistence/services/document.service';
import { FunctionCallService } from '../../services/function-call.service';
import { DocumentEntity } from '../../../persistence/entities';
import { ProcessStateInterface } from '../../interfaces/process-state.interface';
import * as lodash from 'lodash';
import { createHash } from '@loopstack/shared';

// Mock the lodash module
jest.mock('lodash', () => ({
  isEqual: jest.fn(),
}));

// Mock the create-hash util
jest.mock('@loopstack/shared', () => ({
  createHash: jest.fn(),
}));

describe('LoadDocumentTool', () => {
  let loadDocumentTool: LoadDocumentTool;
  let documentService: DocumentService;
  let functionCallService: FunctionCallService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoadDocumentTool,
        {
          provide: DocumentService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: FunctionCallService,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    loadDocumentTool = module.get<LoadDocumentTool>(LoadDocumentTool);
    documentService = module.get<DocumentService>(DocumentService);
    functionCallService = module.get<FunctionCallService>(FunctionCallService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('updateWorkflowDependenciesIfChanged', () => {
    let mockProcessState: ProcessStateInterface;

    beforeEach(() => {
      // Set up mock process state
      mockProcessState = {
        workflow: {
          dependencies: [],
          dependenciesHash: null,
        },
      } as unknown as ProcessStateInterface;
    });

    it('should return false when dependencies have not changed', () => {
      // Arrange
      const oldDependencies = [{ id: '1' }, { id: '2' }] as DocumentEntity[];

      const newDependencies = [{ id: '1' }, { id: '2' }] as DocumentEntity[];

      mockProcessState.workflow!.dependencies = oldDependencies;

      // Mock lodash.isEqual to return true (arrays are equal)
      (lodash.isEqual as jest.Mock).mockReturnValue(true);

      // Act
      const result = loadDocumentTool.updateWorkflowDependenciesIfChanged(
        mockProcessState,
        newDependencies,
      );

      // Assert
      expect(lodash.isEqual).toHaveBeenCalledWith(
        ['1', '2'].sort(),
        ['1', '2'].sort(),
      );
      expect(createHash).not.toHaveBeenCalled();
      expect(mockProcessState.workflow!.dependencies).toEqual(oldDependencies);
      expect(mockProcessState.workflow!.dependenciesHash).toBeNull();
      expect(result).toBe(false);
    });

    it('should update dependencies and hash when dependencies have changed', () => {
      // Arrange
      const oldDependencies = [{ id: '1' }, { id: '2' }] as DocumentEntity[];

      const newDependencies = [{ id: '1' }, { id: '3' }] as DocumentEntity[];

      mockProcessState.workflow!.dependencies = oldDependencies;

      // Mock lodash.isEqual to return false (arrays are different)
      (lodash.isEqual as jest.Mock).mockReturnValue(false);

      // Mock createHash to return a hash value
      const mockHash = 'mock-hash-value';
      (createHash as jest.Mock).mockReturnValue(mockHash);

      // Act
      const result = loadDocumentTool.updateWorkflowDependenciesIfChanged(
        mockProcessState,
        newDependencies,
      );

      // Assert
      expect(lodash.isEqual).toHaveBeenCalledWith(
        ['1', '2'].sort(),
        ['1', '3'].sort(),
      );
      expect(createHash).toHaveBeenCalledWith(['1', '3']);
      expect(mockProcessState.workflow!.dependencies).toEqual(newDependencies);
      expect(mockProcessState.workflow!.dependenciesHash).toBe(mockHash);
      expect(result).toBe(true);
    });

    it('should set dependenciesHash to null when new dependencies array is empty', () => {
      // Arrange
      const oldDependencies = [{ id: '1' }, { id: '2' }] as DocumentEntity[];

      const newDependencies = [] as DocumentEntity[];

      mockProcessState.workflow!.dependencies = oldDependencies;
      mockProcessState.workflow!.dependenciesHash = 'existing-hash';

      // Mock lodash.isEqual to return false (arrays are different)
      (lodash.isEqual as jest.Mock).mockReturnValue(false);

      // Act
      const result = loadDocumentTool.updateWorkflowDependenciesIfChanged(
        mockProcessState,
        newDependencies,
      );

      // Assert
      expect(lodash.isEqual).toHaveBeenCalledWith(['1', '2'].sort(), [].sort());
      expect(createHash).not.toHaveBeenCalled();
      expect(mockProcessState.workflow!.dependencies).toEqual(newDependencies);
      expect(mockProcessState.workflow!.dependenciesHash).toBeNull();
      expect(result).toBe(true);
    });

    it('should handle undefined workflow gracefully', () => {
      // Arrange
      const mockProcessStateWithoutWorkflow = {} as ProcessStateInterface;
      const newDependencies = [{ id: '1' }, { id: '2' }] as DocumentEntity[];

      // Act & Assert
      expect(() => {
        loadDocumentTool.updateWorkflowDependenciesIfChanged(
          mockProcessStateWithoutWorkflow,
          newDependencies,
        );
      }).toThrow();
    });
  });
});
