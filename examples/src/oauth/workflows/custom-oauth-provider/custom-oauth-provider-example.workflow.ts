import { BaseWorkflow, ErrorDocument, Guard, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { FailureInput, RunContext, TransitionInput } from '@loopstack/common';
import { OAuthTokenStore, OAuthWorkflow } from '@loopstack/oauth';
import { MockApiClient, MockProfile } from './mock-provider/mock-api.client';

interface CustomOAuthProviderState {
  requiresAuthentication?: boolean;
  profile?: MockProfile;
}

@Workflow({
  title: 'OAuth - Custom Provider Example',
  name: 'custom_oauth_provider_example',
  description:
    'Signs in through MockOAuthProvider, a custom OAuth provider for a mock authorization server in this app, and calls its protected API with the token from OAuthTokenStore. Runs OAuthWorkflow as a sub-workflow when no valid token is stored. Needs no client credentials.',
})
export class CustomOAuthProviderExampleWorkflow extends BaseWorkflow {
  constructor(
    private readonly tokenStore: OAuthTokenStore,
    private readonly mockApi: MockApiClient,
    private readonly oAuthWorkflow: OAuthWorkflow,
  ) {
    super();
  }

  @Transition({ to: 'profile_fetched' })
  async fetchProfile(_state: CustomOAuthProviderState, ctx: RunContext) {
    // `undefined` when no token is stored; an expired token is refreshed through MockOAuthProvider.refreshToken().
    const accessToken = await this.tokenStore.getValidAccessToken(ctx.userId, 'mock');
    const profile = accessToken ? await this.mockApi.getProfile(accessToken) : undefined;
    this.assignState({ requiresAuthentication: !profile, profile });
  }

  // No token, or the API rejected it -> sign in
  @Transition({ from: 'profile_fetched', to: 'awaiting_auth', priority: 10 })
  @Guard('needsAuth')
  async authRequired() {
    await this.oAuthWorkflow.run(
      { provider: 'mock', scopes: ['profile'] },
      {
        onSuccess: { transition: 'authCompleted' },
        onFailure: { transition: 'authFailed' },
        show: 'inline',
        label: 'Mock provider sign-in required',
      },
    );
  }

  needsAuth(state: CustomOAuthProviderState): boolean {
    return !!state.requiresAuthentication;
  }

  // The token is stored now -> fetch the profile again
  @Transition({ from: 'awaiting_auth', to: 'start', wait: true })
  authCompleted(_state: CustomOAuthProviderState, _input: TransitionInput) {}

  @Transition({ from: 'awaiting_auth', to: 'auth_failed', wait: true })
  async authFailed(_state: CustomOAuthProviderState, input: FailureInput) {
    await this.documentStore.save(ErrorDocument, {
      error: `Mock provider sign-in ${input.status}: ${input.errorMessage ?? 'no reason given'}.`,
    });
  }

  @Transition({ from: 'auth_failed', to: 'start', wait: true })
  retryAuth() {}

  @Transition({ from: 'profile_fetched', to: 'end' })
  async showProfile(state: CustomOAuthProviderState) {
    const profile = state.profile!;
    await this.documentStore.save(MarkdownDocument, {
      markdown: `Signed in to the mock provider as **${profile.name}** (${profile.email}).`,
    });
    this.setResult({ profile });
  }
}
