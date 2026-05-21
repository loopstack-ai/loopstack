import { Injectable } from '@nestjs/common';
import type { BaseApp } from '@loopstack/common';

@Injectable()
export class SandboxEnvironmentService {
  getAgentUrl(app: BaseApp): string {
    const env = app.environments?.find((e) => e.slotId === 'sandbox') ?? app.environments?.[0];
    if (!env?.agentUrl) {
      throw new Error('No environment with agent URL found in app context');
    }
    return env.agentUrl;
  }
}
