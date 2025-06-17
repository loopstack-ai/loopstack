import { Injectable } from '@nestjs/common';
import {
  ContextInterface,
  SnippetConfigType,
  TransitionMetadataInterface,
  WorkflowEntity,
} from '@loopstack/shared';
import { ValueParserService } from '../../common';
import { ConfigurationService } from '../../configuration';

@Injectable()
export class TemplateExpressionEvaluatorService {
  constructor(
    private configurationService: ConfigurationService,
    private valueParserService: ValueParserService,
  ) {}

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
        ? this.valueParserService.prepareAliasVariables(
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

      return this.valueParserService.evalWithContextVariables(
        snippet.value,
        variables,
      );
    };

    return this.valueParserService.evalWithContextVariables<T>(subject, {
      ...aliasVariables,
      useTemplate,
      context,
      data: workflow?.currData,
      transition: transitionData,
      arguments: args,
    });
  }
}
