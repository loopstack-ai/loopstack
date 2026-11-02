import { Module } from '@nestjs/common';
import { EchoClient } from './echo-client';
import { EchoLlmProvider } from './echo-llm-provider';

/** Importing this module is all an app needs: the provider registers itself when the module starts. */
@Module({
  providers: [EchoClient, EchoLlmProvider],
  exports: [EchoClient, EchoLlmProvider],
})
export class EchoModule {}
