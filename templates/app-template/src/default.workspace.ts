import { Injectable } from '@nestjs/common';
import { InjectWorkflow, Workspace, WorkspaceInterface } from '@loopstack/common';
import { CalendarSummaryWorkflow } from './calendar-example-module';
import { GitHubOpenPRsWorkflow } from './github-example-module';
import { HelloWorldWorkflow } from './hello-world/hello-world.workflow';
import { OutlookCalendarWorkflow } from './microsoft-example-module';
import { OAuthWorkflow } from './oauth-module';

@Injectable()
@Workspace({
  config: {
    title: 'Default Workspace',
  },
})
export class DefaultWorkspace implements WorkspaceInterface {
  @InjectWorkflow() helloWorld: HelloWorldWorkflow;
  @InjectWorkflow() oauth: OAuthWorkflow;
  @InjectWorkflow() calendarSummary: CalendarSummaryWorkflow;
  @InjectWorkflow() outlookCalendar: OutlookCalendarWorkflow;
  @InjectWorkflow() gitHubOpenPRs: GitHubOpenPRsWorkflow;
}
