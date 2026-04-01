import { Injectable } from '@nestjs/common';
import { InjectWorkflow, Workspace } from '@loopstack/common';
import { MeetingNotesWorkflow } from './meeting';

@Injectable()
@Workspace({
  config: {
    title: 'Default Workspace',
  },
})
export class DefaultWorkspace {
  @InjectWorkflow() meetingNotesWorkflow: MeetingNotesWorkflow;
}
