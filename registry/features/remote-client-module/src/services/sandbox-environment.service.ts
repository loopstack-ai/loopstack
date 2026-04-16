import { Injectable } from '@nestjs/common';
import { RunContext } from '@loopstack/common';

@Injectable()
export class SandboxEnvironmentService {
  getAgentUrl(context: RunContext): string {
    const env =
      context.workspaceEnvironments?.find((e) => e.slotId === 'sandbox') ?? context.workspaceEnvironments?.[0];
    if (!env?.agentUrl) {
      throw new Error('No environment with agent URL found in context');
    }
    return env.agentUrl; //'http://localhost:3031'
  }
}
