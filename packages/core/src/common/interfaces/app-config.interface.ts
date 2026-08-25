export interface AppConfig {
  nodeEnv: string;
  enableAuth: boolean;
  /** Persist every run's trace events (off by default; runs opt in individually via `trace`). */
  trace: boolean;
}
