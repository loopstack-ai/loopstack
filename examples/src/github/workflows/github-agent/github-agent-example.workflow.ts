import { join } from 'node:path';
import { z } from 'zod';
import { ChatAgentWorkflow } from '@loopstack/agent';
import { BaseWorkflow, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

/** The tools the agent is offered, by their `@Tool({ name })` — `authenticate_github` launches the sign-in. */
const TOOLS = [
  'github_list_repos',
  'github_get_repo',
  'github_create_repo',
  'github_list_branches',
  'github_list_issues',
  'github_get_issue',
  'github_create_issue',
  'github_create_issue_comment',
  'github_list_pull_requests',
  'github_get_pull_request',
  'github_create_pull_request',
  'github_merge_pull_request',
  'github_list_pr_reviews',
  'github_get_file_content',
  'github_create_or_update_file',
  'github_list_directory',
  'github_get_commit',
  'github_list_workflow_runs',
  'github_trigger_workflow',
  'github_get_workflow_run',
  'github_search_code',
  'github_search_repos',
  'github_search_issues',
  'github_get_authenticated_user',
  'github_list_user_orgs',
  'authenticate_github',
];

const GithubAgentExampleArgsSchema = z.object({
  initialMessage: z
    .string()
    .optional()
    .default('Show my GitHub profile and list my five most recently updated repositories.')
    .describe('Initial message shown to the agent.'),
});

type GithubAgentExampleArgs = z.infer<typeof GithubAgentExampleArgsSchema>;

@Workflow({
  title: 'GitHub - Agent Example',
  description:
    'Chat agent with 25 GitHub tools for repositories, issues, pull requests, code, actions, and search. When a tool returns unauthorized, the agent calls authenticate_github to let the user sign in, then retries.',
  name: 'github_agent_example',
  schema: GithubAgentExampleArgsSchema,
})
export class GithubAgentExampleWorkflow extends BaseWorkflow<GithubAgentExampleArgs> {
  constructor(private readonly chatAgentWorkflow: ChatAgentWorkflow) {
    super();
  }

  // Without `taskMode` the chat agent never ends on its own, so the parent names no `onSuccess` transition.
  @Transition({ to: 'chatting' })
  async startChat(_state: Record<string, unknown>, ctx: RunContext<GithubAgentExampleArgs>) {
    await this.chatAgentWorkflow.run(
      {
        system: this.render(join(__dirname, 'templates', 'system.md')),
        tools: TOOLS,
        userMessage: ctx.args.initialMessage,
      },
      { show: 'inline', label: 'GitHub Agent Chat' },
    );
  }
}
