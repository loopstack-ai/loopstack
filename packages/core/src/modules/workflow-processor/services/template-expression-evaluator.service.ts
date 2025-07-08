import { Injectable } from '@nestjs/common';
import {
  ContextInterface,
  SnippetConfigType,
  TransitionMetadataInterface,
  WorkflowEntity,
} from '@loopstack/shared';
import { TemplateService } from '../../common';
import { ConfigurationService } from '../../configuration';
import { get, transform } from 'lodash';
import { z } from 'zod';

class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}

class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

interface ParseOptions {
  schema?: z.ZodType;
  omitAliasVariables?: boolean;
  omitWorkflowData?: boolean;
  omitUseTemplates?: boolean;
}

type TemplateVariables = {
  arguments?: any;
  context?: ContextInterface;
  workflow?: WorkflowEntity;
  transition?: TransitionMetadataInterface;
} & Record<string, any>;

const SNIPPETS_CONFIG_KEY = 'snippets';

const DEFAULT_PARSE_OPTIONS: Partial<ParseOptions> = {
  omitAliasVariables: false,
  omitWorkflowData: false,
  omitUseTemplates: false,
};

@Injectable()
export class TemplateExpressionEvaluatorService {
  constructor(
    private configurationService: ConfigurationService,
    private templateService: TemplateService,
  ) {}

  private prepareAliasVariables(
    aliasReference: Record<string, any>,
    dataSource: Record<string, any>,
  ): Record<string, any> {
    return aliasReference
      ? transform(
          aliasReference,
          (result: Record<string, any>, path: string[], key: string) => {
            result[key] = get(dataSource, path);
          },
          {},
        )
      : {};
  }

  /**
   * Gets alias variables from workflow data
   */
  private getAliasVariables(
    variables: TemplateVariables,
    options: Pick<ParseOptions, 'omitAliasVariables'>,
  ): Record<string, any> {
    if (options.omitAliasVariables) {
      return {};
    }

    const { workflow } = variables;
    if (!workflow?.aliasData || !workflow?.currData) {
      return {};
    }

    return this.prepareAliasVariables(workflow.aliasData, workflow.currData);
  }

  /**
   * Creates template helper functions
   */
  private getTemplateHelper(
    options: Pick<ParseOptions, 'omitUseTemplates'>,
  ): Record<string, any> {
    if (options.omitUseTemplates) {
      return {};
    }

    return {
      useTemplate: (name: string, variables: any): string => {
        const snippet = this.configurationService.get<SnippetConfigType>(
          SNIPPETS_CONFIG_KEY,
          name,
        );

        if (!snippet) {
          return '';
        }

        const result = this.templateService.evaluate(
          snippet.config.value,
          variables,
        );
        return z.string().parse(result);
      },
    };
  }

  /**
   * Extracts workflow data for template evaluation
   */
  private getWorkflowData(
    variables: TemplateVariables,
    options: Pick<ParseOptions, 'omitWorkflowData'>,
  ): Record<string, any> {
    if (options.omitWorkflowData) {
      return {};
    }

    if (!variables.workflow) {
      throw new WorkflowValidationError(
        'Workflow is required when omitWorkflowData is false. Either provide a workflow or set omitWorkflowData to true.',
      );
    }

    return { data: variables.workflow.currData };
  }

  /**
   * Builds the complete template variables object by merging all sources
   */
  private buildTemplateVariables(
    variables: TemplateVariables,
    options: ParseOptions,
  ): Record<string, any> {
    return {
      ...this.getAliasVariables(variables, options),
      ...this.getWorkflowData(variables, options),
      ...variables,
      ...this.getTemplateHelper(options),
    };
  }

  /**
   * Validates the parsed result using Zod schema
   */
  private validateResult<T>(result: T, schema: z.ZodType): T {
    try {
      return schema.parse(result);
    } catch (error) {
      throw new SchemaValidationError(
        `Schema validation failed': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Parses and evaluates template expressions with workflow context and validation
   */
  parse<T>(
    subject: any,
    variables: TemplateVariables,
    options?: ParseOptions,
  ): T {
    if (
      subject == null ||
      (typeof subject !== 'object' && typeof subject !== 'string')
    ) {
      return subject;
    }

    const mergedOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };
    const templateVariables = this.buildTemplateVariables(
      variables,
      mergedOptions,
    );

    const result = this.templateService.evaluateDeep<T>(
      subject,
      templateVariables,
    );

    return options?.schema
      ? this.validateResult<T>(result, options.schema)
      : result;
  }
}
