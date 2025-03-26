import { Test, TestingModule } from '@nestjs/testing';
import { LoadDocumentTool } from '../load-document.tool';
import { DocumentService } from '../../../persistence/services/document.service';
import { ProcessStateInterface } from '../../../processor/interfaces/process-state.interface';
import { DocumentEntity } from '../../../persistence/entities';
import { createMock } from '@golevelup/ts-jest';
import { FunctionCallService } from '../../../common';

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
          useValue: createMock<DocumentService>(),
        },
        {
          provide: FunctionCallService,
          useValue: createMock<FunctionCallService>(),
        },
      ],
    }).compile();

    loadDocumentTool = module.get<LoadDocumentTool>(LoadDocumentTool);
    documentService = module.get<DocumentService>(DocumentService);
    functionCallService = module.get<FunctionCallService>(FunctionCallService);
  });

  describe('replacePreviousDependenciesWithCurrent', () => {
    it('should replace previous entities with current ones while keeping unrelated entities', () => {
      // Arrange
      const mockCurrentEntities: DocumentEntity[] = [
        { id: 'current1', name: 'Current 1' } as DocumentEntity,
        { id: 'current2', name: 'Current 2' } as DocumentEntity,
      ];

      const mockPreviousEntities: DocumentEntity[] = [
        { id: 'prev1', name: 'Previous 1' } as DocumentEntity,
        { id: 'prev2', name: 'Previous 2' } as DocumentEntity,
      ];

      const mockOtherEntities: DocumentEntity[] = [
        { id: 'other1', name: 'Other 1' } as DocumentEntity,
        { id: 'other2', name: 'Other 2' } as DocumentEntity,
      ];

      const mockProcessState: ProcessStateInterface = {
        workflow: {
          dependencies: [...mockPreviousEntities, ...mockOtherEntities],
        },
      } as ProcessStateInterface;

      // Act
      const result = loadDocumentTool.replacePreviousDependenciesWithCurrent(
        mockProcessState.workflow!,
        mockCurrentEntities,
        mockPreviousEntities,
      );

      // Assert
      expect(result).toHaveLength(4); // 2 current + 2 other
      expect(result).toEqual(
        expect.arrayContaining([...mockCurrentEntities, ...mockOtherEntities]),
      );
      expect(result).not.toEqual(expect.arrayContaining(mockPreviousEntities));
    });

    it('should handle empty current entities array', () => {
      // Arrange
      const mockCurrentEntities: DocumentEntity[] = [];

      const mockPreviousEntities: DocumentEntity[] = [
        { id: 'prev1', name: 'Previous 1' } as DocumentEntity,
        { id: 'prev2', name: 'Previous 2' } as DocumentEntity,
      ];

      const mockOtherEntities: DocumentEntity[] = [
        { id: 'other1', name: 'Other 1' } as DocumentEntity,
      ];

      const mockProcessState: ProcessStateInterface = {
        workflow: {
          dependencies: [...mockPreviousEntities, ...mockOtherEntities],
        },
      } as ProcessStateInterface;

      // Act
      const result = loadDocumentTool.replacePreviousDependenciesWithCurrent(
        mockProcessState.workflow!,
        mockCurrentEntities,
        mockPreviousEntities,
      );

      // Assert
      expect(result).toHaveLength(1); // just the other entity
      expect(result).toEqual(mockOtherEntities);
      expect(result).not.toEqual(expect.arrayContaining(mockPreviousEntities));
    });

    it('should handle empty previous entities array', () => {
      // Arrange
      const mockCurrentEntities: DocumentEntity[] = [
        { id: 'current1', name: 'Current 1' } as DocumentEntity,
      ];

      const mockPreviousEntities: DocumentEntity[] = [];

      const mockOtherEntities: DocumentEntity[] = [
        { id: 'other1', name: 'Other 1' } as DocumentEntity,
      ];

      const mockProcessState: ProcessStateInterface = {
        workflow: {
          dependencies: [...mockOtherEntities],
        },
      } as ProcessStateInterface;

      // Act
      const result = loadDocumentTool.replacePreviousDependenciesWithCurrent(
        mockProcessState.workflow!,
        mockCurrentEntities,
        mockPreviousEntities,
      );

      // Assert
      expect(result).toHaveLength(2); // 1 current + 1 other
      expect(result).toEqual([...mockOtherEntities, ...mockCurrentEntities]);
    });

    it('should handle empty dependencies array', () => {
      // Arrange
      const mockCurrentEntities: DocumentEntity[] = [
        { id: 'current1', name: 'Current 1' } as DocumentEntity,
      ];

      const mockPreviousEntities: DocumentEntity[] = [
        { id: 'prev1', name: 'Previous 1' } as DocumentEntity,
      ];

      const mockProcessState: ProcessStateInterface = {
        workflow: {
          dependencies: [],
        },
      } as unknown as ProcessStateInterface;

      // Act
      const result = loadDocumentTool.replacePreviousDependenciesWithCurrent(
        mockProcessState.workflow!,
        mockCurrentEntities,
        mockPreviousEntities,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result).toEqual(mockCurrentEntities);
    });

    it('should correctly handle entities with the same id in different arrays', () => {
      // Arrange
      const mockCurrentEntities: DocumentEntity[] = [
        { id: 'duplicate', name: 'Current Duplicate' } as DocumentEntity,
        { id: 'current1', name: 'Current 1' } as DocumentEntity,
      ];

      const mockPreviousEntities: DocumentEntity[] = [
        { id: 'duplicate', name: 'Previous Duplicate' } as DocumentEntity,
        { id: 'prev1', name: 'Previous 1' } as DocumentEntity,
      ];

      const mockOtherEntities: DocumentEntity[] = [
        { id: 'other1', name: 'Other 1' } as DocumentEntity,
      ];

      const mockProcessState: ProcessStateInterface = {
        workflow: {
          dependencies: [...mockPreviousEntities, ...mockOtherEntities],
        },
      } as ProcessStateInterface;

      // Act
      const result = loadDocumentTool.replacePreviousDependenciesWithCurrent(
        mockProcessState.workflow!,
        mockCurrentEntities,
        mockPreviousEntities,
      );

      // Assert
      expect(result).toHaveLength(3); // 2 current + 1 other

      // Should include current version of the duplicate
      expect(result).toContainEqual({
        id: 'duplicate',
        name: 'Current Duplicate',
      });

      // Should not include previous version of the duplicate
      expect(result).not.toContainEqual({
        id: 'duplicate',
        name: 'Previous Duplicate',
      });

      // Should include other entities
      expect(result).toContainEqual({ id: 'other1', name: 'Other 1' });
    });
  });
});
