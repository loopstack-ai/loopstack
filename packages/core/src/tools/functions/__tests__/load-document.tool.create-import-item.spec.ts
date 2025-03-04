import { Test, TestingModule } from '@nestjs/testing';
import {
  LoadDocumentTool,
  LoadDocumentToolOptions,
} from '../load-document.tool';
import { DocumentService } from '../../../persistence/services/document.service';
import { FunctionCallService } from '../../../processor/services/function-call.service';
import { DocumentEntity } from '../../../persistence/entities/document.entity';
import * as _ from 'lodash';

// Mock the dependencies
jest.mock('lodash', () => ({
  isEqual: jest.fn(),
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
            createDocumentsQuery: jest.fn(),
          },
        },
        {
          provide: FunctionCallService,
          useValue: {
            call: jest.fn(),
          },
        },
      ],
    }).compile();

    loadDocumentTool = module.get<LoadDocumentTool>(LoadDocumentTool);
    documentService = module.get<DocumentService>(DocumentService);
    functionCallService = module.get<FunctionCallService>(FunctionCallService);

    // Mock the applyModifiers method
    jest
      .spyOn(loadDocumentTool as any, 'applyModifiers')
      .mockImplementation((options, entities) => entities);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createImportItem', () => {
    it('should return a single document when many is false', () => {
      // Arrange
      const options: LoadDocumentToolOptions = {
        name: 'testDoc',
        where: { name: 'test' },
        many: false,
      };

      const currentEntities: DocumentEntity[] = [
        { id: '1', content: 'current' } as unknown as DocumentEntity,
      ];
      const previousEntities: DocumentEntity[] = [
        { id: '1', content: 'previous' } as unknown as DocumentEntity,
      ];

      (_.isEqual as jest.Mock).mockReturnValue(false);

      // Act
      const result = loadDocumentTool.createImportItem(
        options,
        currentEntities,
        previousEntities,
      );

      // Assert
      expect(result).toEqual({
        name: 'testDoc',
        prev: previousEntities[0],
        curr: currentEntities[0],
        isNew: false,
        isChanged: true,
        options,
      });
      expect(_.isEqual).toHaveBeenCalledWith(previousEntities, currentEntities);
    });

    it('should return multiple documents when many is true', () => {
      // Arrange
      const options: LoadDocumentToolOptions = {
        name: 'testDocs',
        where: { name: 'test' },
        many: true,
      };

      const currentEntities: DocumentEntity[] = [
        { id: '1', content: 'current1' } as unknown as DocumentEntity,
        { id: '2', content: 'current2' } as unknown as DocumentEntity,
      ];

      const previousEntities: DocumentEntity[] = [
        { id: '1', content: 'previous1' } as unknown as DocumentEntity,
        { id: '2', content: 'previous2' } as unknown as DocumentEntity,
      ];

      (_.isEqual as jest.Mock).mockReturnValue(false);

      // Act
      const result = loadDocumentTool.createImportItem(
        options,
        currentEntities,
        previousEntities,
      );

      // Assert
      expect(result).toEqual({
        name: 'testDocs',
        prev: previousEntities,
        curr: currentEntities,
        isNew: false,
        isChanged: true,
        options,
      });
      expect(_.isEqual).toHaveBeenCalledWith(previousEntities, currentEntities);
    });

    it('should mark as new when there are no previous entities', () => {
      // Arrange
      const options: LoadDocumentToolOptions = {
        name: 'testDoc',
        where: { name: 'test' },
        many: false,
      };

      const currentEntities: DocumentEntity[] = [
        { id: '1', content: 'current' } as unknown as DocumentEntity,
      ];
      const previousEntities: DocumentEntity[] = [];

      // Act
      const result = loadDocumentTool.createImportItem(
        options,
        currentEntities,
        previousEntities,
      );

      // Assert
      expect(result).toEqual({
        name: 'testDoc',
        prev: undefined,
        curr: currentEntities[0],
        isNew: true,
        isChanged: false,
        options,
      });
      // isEqual should not be called when there are no previous entities
      expect(_.isEqual).not.toHaveBeenCalled();
    });

    it('should mark as not changed when entities are equal', () => {
      // Arrange
      const options: LoadDocumentToolOptions = {
        name: 'testDoc',
        where: { name: 'test' },
        many: false,
      };

      const currentEntities: DocumentEntity[] = [
        { id: '1', content: 'same' } as unknown as DocumentEntity,
      ];
      const previousEntities: DocumentEntity[] = [
        { id: '1', content: 'same' } as unknown as DocumentEntity,
      ];

      (_.isEqual as jest.Mock).mockReturnValue(true);

      // Act
      const result = loadDocumentTool.createImportItem(
        options,
        currentEntities,
        previousEntities,
      );

      // Assert
      expect(result).toEqual({
        name: 'testDoc',
        prev: previousEntities[0],
        curr: currentEntities[0],
        isNew: false,
        isChanged: false,
        options,
      });
      expect(_.isEqual).toHaveBeenCalledWith(previousEntities, currentEntities);
    });

    it('should handle empty arrays for both current and previous entities', () => {
      // Arrange
      const options: LoadDocumentToolOptions = {
        name: 'testDoc',
        where: { name: 'test' },
        many: false,
      };

      const currentEntities: DocumentEntity[] = [];
      const previousEntities: DocumentEntity[] = [];

      // Act
      const result = loadDocumentTool.createImportItem(
        options,
        currentEntities,
        previousEntities,
      );

      // Assert
      expect(result).toEqual({
        name: 'testDoc',
        prev: undefined,
        curr: undefined,
        isNew: true,
        isChanged: false,
        options,
      });
      // isEqual should not be called when there are no previous entities
      expect(_.isEqual).not.toHaveBeenCalled();
    });

    it('should correctly handle many:true with empty arrays', () => {
      // Arrange
      const options: LoadDocumentToolOptions = {
        name: 'testDocs',
        where: { name: 'test' },
        many: true,
      };

      const currentEntities: DocumentEntity[] = [];
      const previousEntities: DocumentEntity[] = [];

      // Act
      const result = loadDocumentTool.createImportItem(
        options,
        currentEntities,
        previousEntities,
      );

      // Assert
      expect(result).toEqual({
        name: 'testDocs',
        prev: [],
        curr: [],
        isNew: true,
        isChanged: false,
        options,
      });
      // isEqual should not be called when there are no previous entities
      expect(_.isEqual).not.toHaveBeenCalled();
    });
  });
});
