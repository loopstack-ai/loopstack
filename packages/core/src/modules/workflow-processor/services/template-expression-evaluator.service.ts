import { Injectable } from '@nestjs/common';
import {
  ContextInterface,
  SnippetConfigType,
  TransitionMetadataInterface,
  WorkflowEntity,
} from '@loopstack/shared';
import { TemplateService } from '../../common';
import { ConfigurationService, SchemaRegistry } from '../../configuration';
import { get, transform } from 'lodash';

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
  schemaPath: string | null;
  omitSchemaValidation?: boolean;
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
  omitSchemaValidation: false,
  omitAliasVariables: false,
  omitWorkflowData: false,
  omitUseTemplates: false,
};

@Injectable()
export class TemplateExpressionEvaluatorService {
  constructor(
    private configurationService: ConfigurationService,
    private templateService: TemplateService,
    private schemaRegistry: SchemaRegistry,
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
   * @param variables - Template variables containing workflow data
   * @param options - Options controlling alias variable inclusion
   * @returns Object containing alias variables or empty object
   */
  private getAliasVariables(
    variables: TemplateVariables,
    options: Pick<ParseOptions, 'omitAliasVariables'>
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
   * @param options - Options controlling template helper inclusion
   * @returns Object containing template helpers or empty object
   */
  private getTemplateHelper(options: Pick<ParseOptions, 'omitUseTemplates'>): Record<string, any> {
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

        // todo: make this secure using schema
        return this.templateService.evaluateDeep(snippet.value, variables, null, false);
      },
    };
  }

  /**
   * Extracts workflow data for template evaluation
   * @param variables - Template variables containing workflow data
   * @param options - Options controlling workflow data inclusion
   * @returns Object containing workflow data or empty object
   * @throws {WorkflowValidationError} When workflow is required but not provided
   */
  private getWorkflowData(
    variables: TemplateVariables,
    options: Pick<ParseOptions, 'omitWorkflowData'>
  ): Record<string, any> {
    if (options.omitWorkflowData) {
      return {};
    }

    if (!variables.workflow) {
      throw new WorkflowValidationError(
        'Workflow is required when omitWorkflowData is false. Either provide a workflow or set omitWorkflowData to true.'
      );
    }

    return { data: variables.workflow.currData };
  }

  /**
   * Builds the complete template variables object by merging all sources
   * @param variables - Base template variables
   * @param options - Parse options controlling variable inclusion
   * @returns Combined template variables object
   */
  private buildTemplateVariables(
    variables: TemplateVariables,
    options: ParseOptions
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
   * @param result - The result to validate
   * @param options - Parse options containing schema information
   * @returns Validated result
   * @throws {SchemaValidationError} When schema validation fails
   */
  private validateResult<T>(result: T, options: ParseOptions): T {
    if (options.omitSchemaValidation) {
      return result;
    }

    if (!options.schemaPath) {
      throw new SchemaValidationError('Schema path is required when validation is enabled');
    }

    const zodSchema = this.schemaRegistry.getZodSchema(options.schemaPath);
    if (!zodSchema) {
      throw new SchemaValidationError(`Schema not found at path: ${options.schemaPath}`);
    }

    try {
      return zodSchema.parse(result);
    } catch (error) {
      throw new SchemaValidationError(
        `Schema validation failed for path '${options.schemaPath}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parses and evaluates template expressions with workflow context and validation
   * @param subject - The template subject to evaluate
   * @param variables - Variables available for template evaluation
   * @param options - Configuration options for parsing and validation
   * @returns Parsed and validated result
   * @throws {WorkflowValidationError} When workflow validation fails
   * @throws {SchemaValidationError} When schema validation fails
   */
  parse<T>(
    subject: any,
    variables: TemplateVariables,
    options: ParseOptions
  ): T {
    if (subject == null || (typeof subject !== 'object' && typeof subject !== 'string')) {
      return subject;
    }

    const mergedOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };
    const templateVariables = this.buildTemplateVariables(variables, mergedOptions);

    const result = this.templateService.evaluateDeep<T>(
      subject,
      templateVariables,
      mergedOptions.schemaPath,
      !mergedOptions.omitSchemaValidation
    );

    return this.validateResult<T>(result, mergedOptions);
  }
}