import { Injectable } from '@nestjs/common';
import { Workspace } from '@loopstack/common';

@Injectable()
@Workspace({
  config: {
    title: 'Default Workspace',
  },
})
export class DefaultWorkspace {}
