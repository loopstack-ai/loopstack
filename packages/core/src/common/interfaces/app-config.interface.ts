export interface AppConfig {
  nodeEnv: string;
  enableAuth: boolean;
  /** Debug mode: persist every tool call's args + response envelope per run. */
  recordToolCalls: boolean;
}
