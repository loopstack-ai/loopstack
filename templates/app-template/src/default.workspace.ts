import { Injectable } from '@nestjs/common';
import { InjectWorkflow, Workspace } from '@loopstack/common';

@Injectable()
@Workspace({
  uiConfig: {
    title: 'Default Workspace',
  },
})
export class DefaultWorkspace {}
