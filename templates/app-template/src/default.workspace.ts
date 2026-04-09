import { Injectable } from '@nestjs/common';
import { Workspace } from '@loopstack/common';

@Injectable()
@Workspace({
  uiConfig: {
    title: 'Default Workspace',
  },
})
export class DefaultWorkspace {}
