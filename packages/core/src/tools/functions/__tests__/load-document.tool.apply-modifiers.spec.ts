import { Test, TestingModule } from '@nestjs/testing';
import { LoadDocumentTool, LoadDocumentToolOptions } from '../load-document.tool';
import { DocumentService } from '../../../persistence/services/document.service';
import { FunctionCallService } from '../../../processor/services/function-call.service';
import { DocumentEntity } from '../../../persistence/entities/document.entity';

// Mock dependencies
const mockDocumentService = {
    findOne: jest.fn(),
    find: jest.fn(),
};

const mockFunctionCallService = {
    runEval: jest.fn(),
};

describe('LoadDocumentTool', () => {
    let tool: LoadDocumentTool;
    let functionCallService: FunctionCallService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LoadDocumentTool,
                { provide: DocumentService, useValue: mockDocumentService },
                { provide: FunctionCallService, useValue: mockFunctionCallService },
            ],
        }).compile();

        tool = module.get<LoadDocumentTool>(LoadDocumentTool);
        functionCallService = module.get<FunctionCallService>(FunctionCallService);

        // Clear mock calls between tests
        jest.clearAllMocks();
    });

    describe('applyModifiers', () => {
        const mockDocuments: DocumentEntity[] = [
            { id: '1', contents: { title: 'Doc 1', text: 'Content 1' } } as DocumentEntity,
            { id: '2', contents: { title: 'Doc 2', text: 'Content 2' } } as DocumentEntity,
            { id: '3', contents: { title: 'Doc 3', text: 'Content 3' } } as DocumentEntity,
        ];

        it('should use default map function when no map is provided', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' }
            };

            mockFunctionCallService.runEval.mockImplementation((_, { entity }) => entity.contents);

            // Act
            const result = tool.applyModifiers(options, mockDocuments);

            // Assert
            expect(functionCallService.runEval).toHaveBeenCalledTimes(3);
            expect(functionCallService.runEval).toHaveBeenCalledWith('{ entity.contents }', { entity: mockDocuments[0] });
            expect(result).toEqual([
                { title: 'Doc 1', text: 'Content 1' },
                { title: 'Doc 2', text: 'Content 2' },
                { title: 'Doc 3', text: 'Content 3' }
            ]);
        });

        it('should use custom map function when provided', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                map: '{ entity.contents.title }'
            };

            mockFunctionCallService.runEval.mockImplementation((mapFunc, { entity }) => {
                if (mapFunc === '{ entity.contents.title }') {
                    return entity.contents.title;
                }
                return null;
            });

            // Act
            const result = tool.applyModifiers(options, mockDocuments);

            // Assert
            expect(functionCallService.runEval).toHaveBeenCalledTimes(3);
            expect(functionCallService.runEval).toHaveBeenCalledWith('{ entity.contents.title }', { entity: mockDocuments[0] });
            expect(result).toEqual([
                'Doc 1',
                'Doc 2',
                'Doc 3',
            ]);
        });

        it('should flatten results when flat option is true', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                flat: true
            };

            mockFunctionCallService.runEval.mockImplementation((_, { entity }) => [entity.contents.title, entity.contents.text]);

            // Act
            const result = tool.applyModifiers(options, mockDocuments);

            // Assert
            expect(result).toEqual([
                'Doc 1', 'Content 1',
                'Doc 2', 'Content 2',
                'Doc 3', 'Content 3'
            ]);
        });

        it('should sort results when sortBy option is provided', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                sortBy: {
                    iteratees: ['title'],
                    orders: ['desc']
                }
            };

            mockFunctionCallService.runEval.mockImplementation((_, { entity }) => entity.contents);

            // Act
            const result = tool.applyModifiers(options, mockDocuments);

            // Assert
            expect(result).toEqual([
                { title: 'Doc 3', text: 'Content 3' },
                { title: 'Doc 2', text: 'Content 2' },
                { title: 'Doc 1', text: 'Content 1' },
            ]);
        });

        it('should sort results when sort option is set to true', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                map: '{ entity.contents.title }',
                sort: true
            };

            mockFunctionCallService.runEval.mockImplementation((_, { entity }) => entity.contents.title);

            // Act
            const result = tool.applyModifiers(options, mockDocuments.reverse());

            // Assert
            expect(result).toEqual([
                'Doc 1',
                'Doc 2',
                'Doc 3',
            ]);
        });

        it('should apply map, flatten and sort together', () => {
            const mockDocuments2 = [
                { id: '1', contents: { items: [{ index: 3 }, { index: 2 }] } } as DocumentEntity,
                { id: '2', contents: { items: [{ index: 1 }, { index: 5 }] } } as DocumentEntity,
                { id: '3', contents: { items: [{ index: 4 }] } } as DocumentEntity,
            ]

            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                map: '{ entity.contents.items }',
                flat: true,
                sortBy: {
                    iteratees: ['index'],
                    orders: ['asc']
                }
            };

            // Mock implementation for complex test case
            mockFunctionCallService.runEval.mockImplementation((_, { entity }) => {
                return entity.contents.items;
            });

            // Act
            const result = tool.applyModifiers(options, mockDocuments2);

            // Assert
            expect(functionCallService.runEval).toHaveBeenCalledTimes(3);
            expect(result).toEqual([
                { index: 1 },
                { index: 2 },
                { index: 3 },
                { index: 4 },
                { index: 5 },
            ]);
        });

        it('should handle empty document array', () => {
            // Arrange
            const options: LoadDocumentToolOptions = {
                name: 'test',
                where: { name: 'test' },
                map: '{ entity.contents }',
                flat: true,
                sortBy: {
                    iteratees: ['title'],
                    orders: ['asc']
                }
            };

            // Act
            const result = tool.applyModifiers(options, []);

            // Assert
            expect(result).toEqual([]);
            expect(functionCallService.runEval).not.toHaveBeenCalled();
        });
    });
});