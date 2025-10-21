import { BlockConfig } from '@loopstack/shared';
import { AccessDataUsingResultsContextWorkflow } from './workflows/access-data-using-results-context.workflow';
import { Pipeline } from '@loopstack/core';
import { AccessDataUsingCustomVariableWorkflow } from './workflows/access-data-using-custom-variable.workflow';
import { AccessDataFromArgumentsWorkflow } from './workflows/access-data-from-arguments.workflow';

@BlockConfig({
  imports: [
    AccessDataUsingResultsContextWorkflow,
    AccessDataUsingCustomVariableWorkflow,
    AccessDataFromArgumentsWorkflow,
  ],
  config: {
    title: "Example 1: Pipeline Sequence",
  },
  configFile: __dirname + '/context-data-example.sequence.yaml',
})
export class ContextDataExampleSequence extends Pipeline {}