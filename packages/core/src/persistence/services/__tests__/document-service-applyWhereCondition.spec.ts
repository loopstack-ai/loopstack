import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentService } from '../document.service';
import { DocumentEntity } from '@loopstack/shared';
import { WorkflowService } from '../workflow.service';
import { Brackets } from 'typeorm';

describe('DocumentService - applyWhereCondition', () => {
  let service: DocumentService;
  let mockQueryBuilder;
  let mockDocumentRepository;

  beforeEach(async () => {
    // Create a mock for the query builder that tracks method calls and SQL generation
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getQuery: jest.fn().mockReturnValue('SELECT * FROM document WHERE '),
      getParameters: jest.fn().mockReturnValue({}),
      setParameter: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
    };

    // Create a mock for the document repository
    mockDocumentRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    // Mock workflow service
    const mockWorkflowService = {};

    // Create test module with our service and mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: mockDocumentRepository,
        },
        {
          provide: WorkflowService,
          useValue: mockWorkflowService,
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to test SQL generation
  function testWhereCondition(condition: any, expectedCalls: any[]) {
    // Reset mocks
    mockQueryBuilder.andWhere.mockReset();
    mockQueryBuilder.orWhere.mockReset();

    // Apply the condition
    service.applyWhereCondition(mockQueryBuilder, condition);

    // Check that expected calls were made
    expect(mockQueryBuilder.andWhere.mock.calls).toEqual(
      expectedCalls
        .filter((call) => call.method === 'andWhere')
        .map((call) => call.args),
    );

    expect(mockQueryBuilder.orWhere.mock.calls).toEqual(
      expectedCalls
        .filter((call) => call.method === 'orWhere')
        .map((call) => call.args),
    );
  }

  // Begin tests
  describe('Simple conditions', () => {
    it('should handle direct value comparison', () => {
      testWhereCondition({ name: 'test-document' }, [
        {
          method: 'andWhere',
          args: [`name = :param0`, { param0: 'test-document' }],
        },
      ]);
    });

    it('should handle multiple direct value comparisons', () => {
      testWhereCondition(
        {
          name: 'test-document',
          status: 'active',
        },
        [
          {
            method: 'andWhere',
            args: [`name = :param0`, { param0: 'test-document' }],
          },
          {
            method: 'andWhere',
            args: [`status = :param1`, { param1: 'active' }],
          },
        ],
      );
    });
  });

  describe('NULL operators', () => {
    it('should handle isNull: true', () => {
      testWhereCondition({ type: { isNull: true } }, [
        { method: 'andWhere', args: [`type IS NULL`] },
      ]);
    });

    it('should handle isNull: false', () => {
      testWhereCondition({ type: { isNull: false } }, [
        { method: 'andWhere', args: [`type IS NOT NULL`] },
      ]);
    });
  });

  describe('EXISTS operators', () => {
    it('should handle exists: true', () => {
      testWhereCondition({ metadata: { exists: true } }, [
        { method: 'andWhere', args: [`metadata IS NOT NULL`] },
      ]);
    });

    it('should handle exists: false', () => {
      testWhereCondition({ metadata: { exists: false } }, [
        { method: 'andWhere', args: [`metadata IS NULL`] },
      ]);
    });
  });

  describe('Comparison operators', () => {
    it('should handle eq operator', () => {
      testWhereCondition({ priority: { eq: 5 } }, [
        { method: 'andWhere', args: [`priority = :param0`, { param0: 5 }] },
      ]);
    });

    it('should handle ne operator', () => {
      testWhereCondition({ priority: { ne: 5 } }, [
        { method: 'andWhere', args: [`priority != :param0`, { param0: 5 }] },
      ]);
    });

    it('should handle gt operator', () => {
      testWhereCondition({ createdAt: { gt: '2023-01-01' } }, [
        {
          method: 'andWhere',
          args: [`createdAt > :param0`, { param0: '2023-01-01' }],
        },
      ]);
    });

    it('should handle gte operator', () => {
      testWhereCondition({ createdAt: { gte: '2023-01-01' } }, [
        {
          method: 'andWhere',
          args: [`createdAt >= :param0`, { param0: '2023-01-01' }],
        },
      ]);
    });

    it('should handle lt operator', () => {
      testWhereCondition({ priority: { lt: 10 } }, [
        { method: 'andWhere', args: [`priority < :param0`, { param0: 10 }] },
      ]);
    });

    it('should handle lte operator', () => {
      testWhereCondition({ priority: { lte: 10 } }, [
        { method: 'andWhere', args: [`priority <= :param0`, { param0: 10 }] },
      ]);
    });

    it('should handle like operator', () => {
      testWhereCondition({ name: { like: '%document%' } }, [
        {
          method: 'andWhere',
          args: [`name LIKE :param0`, { param0: '%document%' }],
        },
      ]);
    });

    it('should handle ilike operator (Postgres specific)', () => {
      testWhereCondition({ name: { ilike: '%document%' } }, [
        {
          method: 'andWhere',
          args: [`name ILIKE :param0`, { param0: '%document%' }],
        },
      ]);
    });

    it('should handle between operator', () => {
      testWhereCondition(
        { createdAt: { between: ['2023-01-01', '2023-12-31'] } },
        [
          {
            method: 'andWhere',
            args: [
              `createdAt BETWEEN :param0 AND :param1`,
              { param0: '2023-01-01', param1: '2023-12-31' },
            ],
          },
        ],
      );
    });
  });

  describe('Array operators', () => {
    it('should handle in operator', () => {
      testWhereCondition({ status: { in: ['active', 'pending'] } }, [
        {
          method: 'andWhere',
          args: [`status IN (:...param0)`, { param0: ['active', 'pending'] }],
        },
      ]);
    });

    it('should handle notIn operator', () => {
      testWhereCondition({ status: { notIn: ['deleted', 'archived'] } }, [
        {
          method: 'andWhere',
          args: [
            `status NOT IN (:...param0)`,
            { param0: ['deleted', 'archived'] },
          ],
        },
      ]);
    });

    it('should handle any operator (Postgres array contains)', () => {
      testWhereCondition({ tags: { any: ['important', 'urgent'] } }, [
        {
          method: 'andWhere',
          args: [`tags = ANY(:param0)`, { param0: ['important', 'urgent'] }],
        },
      ]);
    });

    it('should handle all operator (Postgres array contains all)', () => {
      testWhereCondition({ requiredTags: { all: ['verified', 'reviewed'] } }, [
        {
          method: 'andWhere',
          args: [
            `requiredTags = ALL(:param0)`,
            { param0: ['verified', 'reviewed'] },
          ],
        },
      ]);
    });
  });

  describe('NOT operator', () => {
    it('should handle simple not operator', () => {
      testWhereCondition({ category: { not: 'category1' } }, [
        {
          method: 'andWhere',
          args: [`category != :param0`, { param0: 'category1' }],
        },
      ]);
    });

    it('should handle complex not operator', () => {
      // For complex NOT conditions, we need to mock the behavior of Brackets
      const mockBracketsCallback = jest.fn();
      mockQueryBuilder.andWhere.mockImplementationOnce((brackets, params) => {
        if (brackets instanceof Brackets) {
          // Execute the brackets callback with our mock queryBuilder
          brackets.whereFactory(mockQueryBuilder);
          // Verify that inside the brackets, a NOT condition was created
          expect(mockQueryBuilder.where).toHaveBeenCalledWith(
            expect.stringContaining('NOT'),
            expect.any(Object),
          );
        }
        return mockQueryBuilder;
      });

      service.applyWhereCondition(mockQueryBuilder, {
        status: { not: { in: ['deleted', 'archived'] } },
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(Brackets),
      );
    });
  });

  describe('RAW SQL operator', () => {
    it('should handle raw SQL statements', () => {
      testWhereCondition(
        { custom: { raw: 'created_at::date = CURRENT_DATE' } },
        [
          {
            method: 'andWhere',
            args: ['created_at::date = CURRENT_DATE'],
          },
        ],
      );
    });
  });

  describe('Logical operators', () => {
    it('should handle AND operator', () => {
      // For AND conditions, we need to mock the behavior of Brackets
      const mockBracketsCallback = jest.fn();
      mockQueryBuilder.andWhere.mockImplementationOnce((brackets, params) => {
        if (brackets instanceof Brackets) {
          // Execute the brackets callback with our mock queryBuilder
          brackets.whereFactory(mockQueryBuilder);
        }
        return mockQueryBuilder;
      });

      service.applyWhereCondition(mockQueryBuilder, {
        and: [{ status: 'active' }, { priority: { gt: 5 } }],
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(Brackets),
      );
      // We expect two andWhere calls inside the brackets
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3); // 1 for brackets, 2 for conditions
    });

    it('should handle OR operator', () => {
      // For OR conditions, we need to mock the behavior of Brackets
      mockQueryBuilder.andWhere.mockImplementationOnce((brackets, params) => {
        if (brackets instanceof Brackets) {
          // Execute the brackets callback with our mock queryBuilder
          brackets.whereFactory(mockQueryBuilder);
        }
        return mockQueryBuilder;
      });

      service.applyWhereCondition(mockQueryBuilder, {
        or: [{ status: 'active' }, { status: 'pending' }],
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(Brackets),
      );
      // Inside OR brackets, the first is a where and the second is an orWhere
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.orWhere).toHaveBeenCalled();
    });
  });

  describe('Brackets operator', () => {
    it('should handle explicit brackets', () => {
      // For brackets, we need to mock the behavior of Brackets
      mockQueryBuilder.andWhere.mockImplementationOnce((brackets, params) => {
        if (brackets instanceof Brackets) {
          // Execute the brackets callback with our mock queryBuilder
          brackets.whereFactory(mockQueryBuilder);
        }
        return mockQueryBuilder;
      });

      service.applyWhereCondition(mockQueryBuilder, {
        brackets: {
          status: 'active',
          priority: { gt: 5 },
        },
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(Brackets),
      );
    });
  });

  describe('Complex nested conditions', () => {
    it('should handle deeply nested conditions', () => {
      // This test will be more integration-like, checking that complex conditions work
      // We need to set up mocks for nested brackets
      let bracketsCount = 0;
      mockQueryBuilder.andWhere.mockImplementation((brackets, params) => {
        if (brackets instanceof Brackets) {
          // Execute the brackets callback with our mock queryBuilder
          bracketsCount++;
          brackets.whereFactory(mockQueryBuilder);
        }
        return mockQueryBuilder;
      });

      mockQueryBuilder.orWhere.mockImplementation((brackets, params) => {
        if (brackets instanceof Brackets) {
          // Execute the brackets callback with our mock queryBuilder
          bracketsCount++;
          brackets.whereFactory(mockQueryBuilder);
        }
        return mockQueryBuilder;
      });

      service.applyWhereCondition(mockQueryBuilder, {
        or: [
          { status: 'active' },
          {
            brackets: {
              and: [
                { priority: { gt: 5 } },
                {
                  or: [{ category: 'urgent' }, { assignee: 'admin' }],
                },
              ],
            },
          },
        ],
      });

      // We expect multiple bracket operations for this complex query
      expect(bracketsCount).toBeGreaterThan(1);
    });

    it('should handle your YAML example correctly', () => {
      // Test the example from the requirement
      const yamlExample = {
        name: 'automator/step/output-schema.document',
        tags: {
          in: ['tag1', 'tag2'],
        },
        category: {
          not: 'category1',
        },
        type: {
          isNull: true,
        },
      };

      const expectedCalls = [
        {
          method: 'andWhere',
          args: [
            `name = :param0`,
            { param0: 'automator/step/output-schema.document' },
          ],
        },
        {
          method: 'andWhere',
          args: [`tags IN (:...param1)`, { param1: ['tag1', 'tag2'] }],
        },
        {
          method: 'andWhere',
          args: [`category != :param2`, { param2: 'category1' }],
        },
        {
          method: 'andWhere',
          args: [`type IS NULL`],
        },
      ];

      testWhereCondition(yamlExample, expectedCalls);
    });
  });

  describe('Array containment operators', () => {
    it('should handle contains operator (find documents with all specified labels)', () => {
      const queryLabels = ['important', 'urgent', 'review'];

      testWhereCondition({ labels: { contains: queryLabels } }, [
        {
          method: 'andWhere',
          args: [
            `labels @> ARRAY[:...param0]::varchar[]`,
            { param0: queryLabels },
          ],
        },
      ]);
    });

    it('should handle combination of contains with other conditions', () => {
      const queryLabels = ['important', 'urgent'];

      testWhereCondition(
        {
          status: 'active',
          labels: { contains: queryLabels },
        },
        [
          {
            method: 'andWhere',
            args: [`status = :param0`, { param0: 'active' }],
          },
          {
            method: 'andWhere',
            args: [
              `labels @> ARRAY[:...param1]::varchar[]`,
              { param1: queryLabels },
            ],
          },
        ],
      );
    });
  });

  describe('Array containsAnyOf operators', () => {
    it('should handle containsAnyOf operator (find documents with any specified label)', () => {
      const queryLabels = ['important', 'urgent', 'review'];

      testWhereCondition({ labels: { containsAnyOf: queryLabels } }, [
        {
          method: 'andWhere',
          args: [
            `labels && ARRAY[:...param0]::varchar[]`,
            { param0: queryLabels },
          ],
        },
      ]);
    });

    it('should handle combination of containsAnyOf with other conditions', () => {
      const queryLabels = ['important', 'urgent'];

      testWhereCondition(
        {
          status: 'active',
          labels: { containsAnyOf: queryLabels },
        },
        [
          {
            method: 'andWhere',
            args: [`status = :param0`, { param0: 'active' }],
          },
          {
            method: 'andWhere',
            args: [
              `labels && ARRAY[:...param1]::varchar[]`,
              { param1: queryLabels },
            ],
          },
        ],
      );
    });
  });
});
