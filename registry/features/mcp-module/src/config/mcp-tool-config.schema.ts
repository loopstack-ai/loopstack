import { z } from 'zod';

const RESERVED_SECRET_HEADER_NAMES: ReadonlySet<string> = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
]);

function rejectSecretsInDefaults(defaults: Record<string, string> | undefined, ctx: z.RefinementCtx): void {
  if (!defaults) return;
  for (const name of Object.keys(defaults)) {
    if (RESERVED_SECRET_HEADER_NAMES.has(name.toLowerCase())) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultHeaders', name],
        message: `Header "${name}" likely carries a secret; use headerEnv or hostHeaderEnv instead of defaultHeaders.`,
      });
    }
  }
}

export const McpToolConfigSchema = z
  .object({
    allowedHosts: z
      .array(z.string().min(1))
      .min(1)
      .describe(
        'Hostnames allowed for `serverUrl`. Use `*.example.com` to allow any subdomain of example.com (also matches example.com).',
      ),

    allowInsecureHttp: z.boolean().optional().default(false),

    /**
     * Set true only for trusted local MCP (e.g. `mcp-proxy` on localhost). When false,
     * DNS / literal IPs must resolve to public addresses — blocks loopback and RFC1918
     * even if the hostname is allowlisted (SSRF hardening).
     */
    allowPrivateHosts: z.boolean().optional().default(false),

    /** Static, non-secret header values. Sensitive header names are rejected — use headerEnv. */
    defaultHeaders: z.record(z.string(), z.string()).optional(),

    /** Map HTTP header name -> `process.env` key. Applied to every host. */
    headerEnv: z.record(z.string(), z.string()).optional(),

    /**
     * Map hostname -> `{ headerName -> processEnvKey }`. Hostname can be a specific FQDN
     * or `'*'` for all hosts. Host-specific entries override `'*'` for the same header name.
     */
    hostHeaderEnv: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  })
  .strict()
  .superRefine((cfg, ctx) => {
    rejectSecretsInDefaults(cfg.defaultHeaders, ctx);
  });

export type McpToolConfig = z.infer<typeof McpToolConfigSchema>;
