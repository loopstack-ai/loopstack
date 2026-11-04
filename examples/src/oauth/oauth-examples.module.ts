import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { CustomOAuthProviderExampleWorkflow } from './workflows/custom-oauth-provider/custom-oauth-provider-example.workflow';
import { MockProviderModule } from './workflows/custom-oauth-provider/mock-provider/mock-provider.module';

const WORKFLOWS = [CustomOAuthProviderExampleWorkflow];

@StudioApp({
  title: 'OAuth Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [MockProviderModule],
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class OAuthExamplesModule {}
