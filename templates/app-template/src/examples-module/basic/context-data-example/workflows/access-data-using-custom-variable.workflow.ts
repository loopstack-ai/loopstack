import { CreateChatMessage, CreateMock, Workflow } from '@loopstack/core';
import { Block, Input, Output } from '@loopstack/shared';

@Block({
  imports: [CreateMock, CreateChatMessage],
  config: {
    title: 'Example: Access Data Using Custom Variables',
  },
  configFile: __dirname + '/access-data-using-custom-variable.workflow.yaml',
})
export class AccessDataUsingCustomVariableWorkflow extends Workflow  {

  // Custom property to read and write data
  // Make accessible using Input and Output decorator
  @Input()
  @Output()
  message?: string;

  // Helper method to access the property
  @Output()
  get messageInUpperCase() {
    return this.message?.toUpperCase();
  }
}