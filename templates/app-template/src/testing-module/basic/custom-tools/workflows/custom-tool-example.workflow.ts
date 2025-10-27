import { CreateChatMessage, Workflow } from '@loopstack/core';
import { BlockConfig } from '@loopstack/shared';
import { z } from 'zod';
import { MathSumTool } from '../tools/math-sum.tool';
import { Exclude, Expose } from 'class-transformer';
import { StatelessCounterTool } from '../tools/stateless-counter.tool';
import { StatefulCounterTool } from '../tools/stateful-counter.tool';

const propertiesSchema = z.object({
  a: z.number().default(1),
  b: z.number().default(2),
});

@BlockConfig({
  // import required tools
  imports: [
    MathSumTool,
    StatelessCounterTool,
    StatefulCounterTool,
    CreateChatMessage,
  ],

  // schema for argument validation/parsing (sets default value for testing)
  properties: propertiesSchema,

  // configuration
  config: {
    title: 'Example 3: Custom Tool',
  },

  // include workflow configuration from yaml file
  configFile: __dirname + '/custom-tool-example.workflow.yaml',
})
export class CustomToolExampleWorkflow extends Workflow  {

  // default: property is accessible
  @Expose()
  accessibleProperty = true;

  // not accessible property
  @Exclude()
  notAccessibleProperty = true;

  // property only accessible in workflow context
  @Expose({ groups: ['workflow'] })
  workflowContextProperty = true;

  // property accessible in tool and workflow context
  @Expose({ groups: ['tool' , 'workflow'] })
  toolContextProperty = true;

  // accessible getter methods
  @Expose()
  get exposedGetter() {
    return true;
  }

  @Expose()
  get calculate() {
    return this.args.a + this.args.b;
  }
}