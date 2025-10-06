import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  FindOptionsOrder,
  OrderByCondition,
  Repository,
  SelectQueryBuilder,
  WhereExpressionBuilder,
} from 'typeorm';
import {
  DocumentEntity,
  ExpressionString,
  WorkflowEntity,
  TransitionMetadataInterface,
} from '@loopstack/shared';
import { WorkflowService } from './workflow.service';
import { ContextInterface } from '@loopstack/shared';
import { z } from 'zod';

const NullOperator = z.object({
  isNull: z.boolean(),
});

const ComparisonOperator = z.object({
  eq: z.any().optional(),
  ne: z.any().optional(),
  gt: z.any().optional(),
  gte: z.any().optional(),
  lt: z.any().optional(),
  lte: z.any().optional(),
  like: z.string().optional(),
  ilike: z.string().optional(),
  between: z.tuple([z.any(), z.any()]).optional(),
});

const ArrayOperator = z.object({
  in: z.array(z.any()).optional(),
  notIn: z.array(z.any()).optional(),
  any: z.array(z.any()).optional(),
  all: z.array(z.any()).optional(),
});

const ArrayContainmentOperator = z.object({
  contains: z.array(z.any()).optional(),
});

const ArrayContainmentAnyOfOperator = z.object({
  containsAnyOf: z.string().optional(),
});

const ExistsOperator = z.object({
  exists: z.boolean(),
});

const ConditionRef = z.lazy(() => WhereCondition);

const NotOperator = z.object({
  not: ConditionRef,
});

const BracketOperator = z.object({
  brackets: ConditionRef,
});

const LogicalOperator = z.object({
  and: z.array(ConditionRef).optional(),
  or: z.array(ConditionRef).optional(),
});

const RawOperator = z.object({
  raw: z.string(),
});

const PropertyCondition = z.union([
  z.string(),
  z.array(z.string()),
  z.array(ExpressionString),
  ExpressionString,
  NullOperator,
  ComparisonOperator,
  ArrayOperator,
  ArrayContainmentOperator,
  ArrayContainmentAnyOfOperator,
  ExistsOperator,
  NotOperator,
  BracketOperator,
  RawOperator,
]);

export const WhereCondition = z.union([
  // z.record(z.string(), PropertyCondition),
  // todo: explicitly define where properties:
  z.object({
    name: PropertyCondition,
  }),
  LogicalOperator,
  BracketOperator,
]);

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    private workflowService: WorkflowService,
  ) {}

  create(
    workspaceId: string,
    pipelineId: string,
    userId: string,
    workflow: WorkflowEntity,
    transitionData: TransitionMetadataInterface,
    data: Partial<DocumentEntity>,
  ): DocumentEntity {
    const document = this.documentRepository.create({
      ...data,
      transition: transitionData.transition,
      index: workflow!.documents?.length ?? 0,
      workflowIndex: workflow!.index,
      place: workflow!.place,
      labels: workflow!.labels,
      workflow: { id: workflow.id } as WorkflowEntity,
      workspaceId: workspaceId,
      pipelineId: pipelineId,
      createdBy: userId,
    });

    this.workflowService.addDocument(workflow, document);
    return document;
  }

  update(workflow: WorkflowEntity, entity: DocumentEntity): DocumentEntity {
    const document = this.documentRepository.create(entity);
    this.workflowService.updateDocumentReference(workflow, document);
    return document;
  }

  createDocumentsQuery(
    pipelineId: string,
    workspaceId: string,
    where?: z.infer<typeof WhereCondition>,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: FindOptionsOrder<any>;
      isValidOnly?: boolean;
      isGlobal?: boolean;
      ltWorkflowIndex?: string;
    },
  ): SelectQueryBuilder<DocumentEntity> {
    const queryBuilder = this.documentRepository.createQueryBuilder();

    if (!options?.isGlobal) {
      // from same root pipeline
      queryBuilder.where('pipeline_id = :pipelineId', {
        pipelineId: pipelineId,
      });
    } else {
      // from same root workspace
      queryBuilder.where('workspace_id = :workspaceId', {
        workspaceId,
      });
    }

    if (where) {
      this.applyWhereCondition(queryBuilder, where);
    }

    if (undefined !== options?.ltWorkflowIndex) {
      queryBuilder.andWhere(
        `(workflow_index <@ :index OR text(workflow_index) < text(:index))`,
        { index: options.ltWorkflowIndex },
      );
    }

    if (undefined !== options?.isValidOnly) {
      queryBuilder.andWhere('is_invalidated = :isInvalidated', {
        isInvalidated: !options.isValidOnly,
      });
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(options.orderBy as OrderByCondition);
    }

    if (undefined !== options?.take) {
      queryBuilder.limit(options.take);
    }

    if (undefined !== options?.skip) {
      queryBuilder.skip(options.skip);
    }

    return queryBuilder;
  }

  public applyWhereCondition(
    queryBuilder: WhereExpressionBuilder,
    condition: any,
    paramIndex = 0,
  ): number {
    // Handle logical operators (AND, OR)
    if ('and' in condition && Array.isArray(condition.and)) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          condition.and.forEach((subCondition) => {
            paramIndex = this.applyWhereCondition(qb, subCondition, paramIndex);
          });
        }),
      );
      return paramIndex;
    }

    if ('or' in condition && Array.isArray(condition.or)) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          let first = true;
          condition.or.forEach((subCondition) => {
            if (first) {
              // For the first condition in OR, use where() instead of orWhere()
              // to avoid adding an initial 'OR' without a preceding condition
              first = false;
              const subQb = this.documentRepository.createQueryBuilder();
              paramIndex = this.applyWhereCondition(
                subQb,
                subCondition,
                paramIndex,
              );
              qb.where(
                `(${subQb.getQuery().replace(/^SELECT .* WHERE /, '')})`,
                subQb.getParameters(),
              );
            } else {
              paramIndex = this.applySubCondition(
                qb,
                subCondition,
                paramIndex,
                'or',
              );
            }
          });
        }),
      );
      return paramIndex;
    }

    // Handle explicit brackets
    if ('brackets' in condition) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          paramIndex = this.applyWhereCondition(
            qb,
            condition.brackets,
            paramIndex,
          );
        }),
      );
      return paramIndex;
    }

    // Handle field-based conditions
    for (const [field, value] of Object.entries(condition)) {
      if (typeof value === 'object' && value !== null) {
        paramIndex = this.applyFieldOperator(
          queryBuilder,
          field,
          value,
          paramIndex,
        );
      } else {
        // Direct value comparison (equals)
        const paramName = `param${paramIndex++}`;
        queryBuilder.andWhere(`${field} = :${paramName}`, {
          [paramName]: value,
        });
      }
    }

    return paramIndex;
  }

  private applySubCondition(
    queryBuilder: WhereExpressionBuilder,
    condition: any,
    paramIndex: number,
    joinType: 'and' | 'or' = 'and',
  ): number {
    const subQb = this.documentRepository.createQueryBuilder();
    paramIndex = this.applyWhereCondition(subQb, condition, paramIndex);

    const whereClause = subQb.getQuery().replace(/^SELECT .* WHERE /, '');
    const parameters = subQb.getParameters();

    if (joinType === 'and') {
      queryBuilder.andWhere(`(${whereClause})`, parameters);
    } else {
      queryBuilder.orWhere(`(${whereClause})`, parameters);
    }

    return paramIndex;
  }

  private applyFieldOperator(
    queryBuilder: WhereExpressionBuilder,
    field: string,
    operator: any,
    paramIndex: number,
  ): number {
    // Handle NULL checks
    if ('isNull' in operator) {
      if (operator.isNull) {
        queryBuilder.andWhere(`${field} IS NULL`);
      } else {
        queryBuilder.andWhere(`${field} IS NOT NULL`);
      }
      return paramIndex;
    }

    // Handle EXISTS operator
    if ('exists' in operator) {
      if (operator.exists) {
        queryBuilder.andWhere(`${field} IS NOT NULL`);
      } else {
        queryBuilder.andWhere(`${field} IS NULL`);
      }
      return paramIndex;
    }

    // Handle NOT operator
    if ('not' in operator) {
      if (typeof operator.not === 'object' && operator.not !== null) {
        // Complex NOT condition
        queryBuilder.andWhere(
          new Brackets((qb) => {
            // Create a negated subquery
            const subQb = this.documentRepository.createQueryBuilder();
            paramIndex = this.applyWhereCondition(
              subQb,
              { [field]: operator.not },
              paramIndex,
            );
            const whereClause = subQb
              .getQuery()
              .replace(/^SELECT .* WHERE /, '');
            qb.where(`NOT (${whereClause})`, subQb.getParameters());
          }),
        );
      } else {
        // Simple NOT equal
        const paramName = `param${paramIndex++}`;
        queryBuilder.andWhere(`${field} != :${paramName}`, {
          [paramName]: operator.not,
        });
      }
      return paramIndex;
    }

    // Handle RAW SQL
    if ('raw' in operator) {
      queryBuilder.andWhere(operator.raw);
      return paramIndex;
    }

    // Handle comparison operators
    const comparisonOperators = {
      eq: '=',
      ne: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      like: 'LIKE',
      ilike: 'ILIKE',
    };

    for (const [op, symbol] of Object.entries(comparisonOperators)) {
      if (op in operator) {
        const paramName = `param${paramIndex++}`;
        queryBuilder.andWhere(`${field} ${symbol} :${paramName}`, {
          [paramName]: operator[op],
        });
        return paramIndex;
      }
    }

    // Handle BETWEEN operator
    if (
      'between' in operator &&
      Array.isArray(operator.between) &&
      operator.between.length === 2
    ) {
      const paramNameLower = `param${paramIndex++}`;
      const paramNameUpper = `param${paramIndex++}`;
      queryBuilder.andWhere(
        `${field} BETWEEN :${paramNameLower} AND :${paramNameUpper}`,
        {
          [paramNameLower]: operator.between[0],
          [paramNameUpper]: operator.between[1],
        },
      );
      return paramIndex;
    }

    // Handle array operators
    if ('in' in operator && Array.isArray(operator.in)) {
      const paramName = `param${paramIndex++}`;
      queryBuilder.andWhere(`${field} IN (:...${paramName})`, {
        [paramName]: operator.in,
      });
      return paramIndex;
    }

    if ('notIn' in operator && Array.isArray(operator.notIn)) {
      const paramName = `param${paramIndex++}`;
      queryBuilder.andWhere(`${field} NOT IN (:...${paramName})`, {
        [paramName]: operator.notIn,
      });
      return paramIndex;
    }

    if ('any' in operator && Array.isArray(operator.any)) {
      const paramName = `param${paramIndex++}`;
      queryBuilder.andWhere(`${field} = ANY(:${paramName})`, {
        [paramName]: operator.any,
      });
      return paramIndex;
    }

    if ('all' in operator && Array.isArray(operator.all)) {
      const paramName = `param${paramIndex++}`;
      // This is a bit tricky with TypeORM, but we can use a similar approach
      queryBuilder.andWhere(`${field} = ALL(:${paramName})`, {
        [paramName]: operator.all,
      });
      return paramIndex;
    }

    if ('contains' in operator && Array.isArray(operator.contains)) {
      const paramName = `param${paramIndex++}`;
      queryBuilder.andWhere(`${field} @> ARRAY[:...${paramName}]::varchar[]`, {
        [paramName]: operator.contains,
      });
      return paramIndex;
    }

    if ('containsAnyOf' in operator && Array.isArray(operator.containsAnyOf)) {
      const paramName = `param${paramIndex++}`;
      queryBuilder.andWhere(`${field} && ARRAY[:...${paramName}]::varchar[]`, {
        [paramName]: operator.containsAnyOf,
      });
      return paramIndex;
    }

    return paramIndex;
  }
}
