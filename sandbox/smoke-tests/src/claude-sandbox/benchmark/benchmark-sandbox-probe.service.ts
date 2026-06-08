import { Injectable } from '@nestjs/common';
import { RemoteClient } from '@loopstack/remote-client';
import { APP_DIR, RETRO_FILE } from './benchmark.constants';
import { ObjectiveSignals } from './benchmark.types';

const CHECK_TIMEOUT_MS = 600_000;

/** Probes the app Claude built in the sandbox for objective, non-hallucinatable signals. */
@Injectable()
export class BenchmarkSandboxProbe {
  constructor(private readonly remote: RemoteClient) {}

  /** Re-runs build and tests ourselves so success cannot be hallucinated by the model. */
  async collectObjectiveSignals(agentUrl: string): Promise<ObjectiveSignals> {
    const buildCheck = await this.remote.executeCommand(agentUrl, 'npm run build', APP_DIR, CHECK_TIMEOUT_MS);
    const testCheck = await this.remote.executeCommand(
      agentUrl,
      'npm test 2>&1 | tail -n 40',
      APP_DIR,
      CHECK_TIMEOUT_MS,
    );
    const fileCount = await this.remote.executeCommand(agentUrl, 'find src -name "*.ts" 2>/dev/null | wc -l', APP_DIR);

    return {
      buildPassed: buildCheck.exitCode === 0,
      testsPassed: testCheck.exitCode === 0,
      filesChanged: parseInt(fileCount.stdout.trim(), 10) || 0,
    };
  }

  async readRetroJson(agentUrl: string): Promise<string> {
    const file = await this.remote.readFile(agentUrl, RETRO_FILE).catch(() => ({ content: '' }));
    return file.content;
  }
}
