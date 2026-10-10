export interface EnvReader {
  get(key: string): string | undefined;
}

export class ProcessEnvReader implements EnvReader {
  get(key: string): string | undefined {
    const v = process.env[key];
    if (v === undefined || v === '') return undefined;
    return v;
  }
}

export const MCP_ENV_READER = Symbol('MCP_ENV_READER');
