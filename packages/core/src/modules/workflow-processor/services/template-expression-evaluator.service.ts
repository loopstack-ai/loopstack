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

@Injectable()
export class TemplateExpressionEvaluatorService {
  constructor(
    private configurationService: ConfigurationService,
    private templateService: TemplateService,
  ) {}

  prepareAliasVariables(
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

  evaluate<T>(
    subject: any,
    args: any,
    context: ContextInterface,
    workflow: WorkflowEntity | undefined,
    transitionData: TransitionMetadataInterface,
  ): T {
    // replace the alias values with actual data
    const aliasVariables =
      workflow?.aliasData && workflow.currData
        ? this.prepareAliasVariables(
            workflow.aliasData,
            workflow.currData,
          )
        : {};

    const useTemplate = (name: string, variables: any): string => {
      const snippet = this.configurationService.get<SnippetConfigType>(
        'snippets',
        name,
      );
      if (!snippet) {
        return '';
      }

      return this.templateService.evaluateDeep(
        snippet.value,
        variables,
      );
    };

    return this.templateService.evaluateDeep<T>(subject, {
      ...aliasVariables,
      useTemplate,
      context,
      data: workflow?.currData,
      transition: transitionData,
      arguments: args,
      workflow,
    });
  }
}
