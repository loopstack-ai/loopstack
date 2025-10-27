import { CreateChatMessage, CreateMock, Workflow } from '@loopstack/core';
import { BlockConfig, Input } from '@loopstack/shared';
import { Expose } from 'class-transformer';

@BlockConfig({
  imports: [CreateMock, CreateChatMessage],
  config: {
    title: 'Access Data Using Custom Variables',
  },
  configFile: __dirname + '/access-data-using-custom-variable.workflow.yaml',
})
export class AccessDataUsingCustomVariableWorkflow extends Workflow  {

  // Custom property to read and write data
  // Make accessible using Input and Output decorator
  @Input()
  @Expose()
  message?: string;

  // Helper method to access the property
  @Expose()
  get messageInUpperCase() {
    return this.message?.toUpperCase();
  }
}