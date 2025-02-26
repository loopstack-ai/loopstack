import { Test, TestingModule } from '@nestjs/testing';
import { LoadDocumentTool, LoadDocumentToolOptions } from '../load-document.tool';
import { DocumentService } from '../../../persistence/services/document.service';
import { FunctionCallService } from '../../../processor/services/function-call.service';
import { DocumentEntity } from '../../../persistence/entities/document.entity';

describe('LoadDocumentTool', () => {
    let tool: LoadDocumentTool;
    let functionCallService: FunctionCallService;
    let documentService: DocumentService;

    // Sample documents for testing
    const mockDocuments: DocumentEntity[] = [
        { id: '1', name: 'doc1', content: 'content1', type: 'type1' } as unknown as  DocumentEntity,
        { id: '2', name: 'doc2', content: 'content2', type: 'type2' } as unknown as DocumentEntity,
        { id: '3', name: 'doc3', content: 'content3', type: 'type1' } as unknown as DocumentEntity,
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LoadDocumentTool,
                {
                    provide: DocumentService,
                    useValue: {
                        findMany: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: FunctionCallService,
                    useValue: {
                        runEval: jest.fn(),
                    },
                },
            ],
        }).compile();

        tool = module.get<LoadDocumentTool>(LoadDocumentTool);
        functionCallService = module.get<FunctionCallService>(FunctionCallService);
        documentService = module.get<DocumentService>(DocumentService);
    });

    describe('applyFilters', () => {
        it('should return the original array when filter is not provided', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
            };

            // Act
            const result = tool.applyFilters(options, mockDocuments);

            // Assert
            expect(result).toEqual(mockDocuments);
            expect(functionCallService.runEval).not.toHaveBeenCalled();
        });

        it('should filter items when filter is both provided', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                filter: 'item.type === "type1"',
            };

            // Mock the runEval method to return true for type1 documents
            jest.spyOn(functionCallService, 'runEval').mockImplementation((_, context) => {
                return (context.item as DocumentEntity).type === 'type1';
            });

            // Act
            const result = tool.applyFilters(options, mockDocuments);

            // Assert
            expect(result).toHaveLength(2);
            expect(result).toEqual([mockDocuments[0], mockDocuments[2]]);
            expect(functionCallService.runEval).toHaveBeenCalledTimes(3);
            expect(functionCallService.runEval).toHaveBeenCalledWith(options.filter, { item: mockDocuments[0] });
            expect(functionCallService.runEval).toHaveBeenCalledWith(options.filter, { item: mockDocuments[1] });
            expect(functionCallService.runEval).toHaveBeenCalledWith(options.filter, { item: mockDocuments[2] });
        });

        it('should return empty array when no items match the filter', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                many: true,
                filter: 'item.type === "non-existent-type"',
            };

            // Mock the runEval method to always return false
            jest.spyOn(functionCallService, 'runEval').mockReturnValue(false);

            // Act
            const result = tool.applyFilters(options, mockDocuments);

            // Assert
            expect(result).toHaveLength(0);
            expect(result).toEqual([]);
            expect(functionCallService.runEval).toHaveBeenCalledTimes(3);
        });

        it('should handle empty input array', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                many: true,
                filter: 'item.type === "type1"',
            };

            // Act
            const result = tool.applyFilters(options, []);

            // Assert
            expect(result).toHaveLength(0);
            expect(result).toEqual([]);
            expect(functionCallService.runEval).not.toHaveBeenCalled();
        });

        it('should properly handle complex filter expressions', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                many: true,
                filter: 'item.type === "type1" && item.name.includes("doc")',
            };

            // Mock the runEval method with more complex logic
            const mockRunEval = jest.spyOn(functionCallService, 'runEval').mockImplementation((_, context) => {
                const item = context.item as DocumentEntity;
                return item.type === 'type1' && item.name.includes('doc');
            });

            // Act
            const result = tool.applyFilters(options, mockDocuments);

            // Assert
            expect(result).toHaveLength(2);
            expect(result).toEqual([mockDocuments[0], mockDocuments[2]]);
            expect(mockRunEval).toHaveBeenCalledTimes(3);
        });
    });
});