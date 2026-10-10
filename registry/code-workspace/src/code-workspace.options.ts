/**
 * Config token + option types for {@link CodeWorkspaceModule}. Kept in a leaf file (no service/module
 * imports) so the provisioner can import the token without a circular dependency on the module.
 */

/**
 * Configuration for `CodeWorkspaceModule.forRoot`. All fields optional; sensible defaults applied.
 *
 * @public
 */
export interface CodeWorkspaceOptions {
  /** Port the in-container agent server listens on (health + workspace routes). Default `3001`. */
  agentPort?: number;
  /** Host base directory holding per-workspace state (`<stateDir>/<workspaceId>/base` + `/workflows`). */
  stateDir?: string;
  /**
   * The name every container, volume and label this module creates is built from. Default
   * {@link DEFAULT_NAMESPACE}.
   *
   * It is the **prefix** the facets are added to: containers and volumes are labelled and swept by
   * `<namespace>.workspace` and `<namespace>.workflow`, and named `<namespace with dashes>-…`. So two
   * applications with different namespaces never see — or remove — each other's.
   *
   * Changing it on a running installation makes everything created under the old one invisible to the
   * sweep, so reclaim first.
   */
  namespace?: string;
  /**
   * The base keys this application provisions — every one its configuration declares.
   *
   * What makes a base on disk identifiable as current or left over, and the only thing the module cannot work
   * out for itself: a base belongs to the config that provisions it, and this module knows what is on disk
   * and nothing about configs.
   *
   * Leave it out and no base is ever proposed for removal. That is deliberate: reading "none declared" as
   * "none wanted" would propose every base on disk, which is the one mistake here that cannot be undone.
   */
  knownBaseKeys?: string[];
}

/** {@link CodeWorkspaceOptions} with defaults applied. */
export interface ResolvedCodeWorkspaceOptions {
  agentPort: number;
  stateDir?: string;
  namespace: string;
  knownBaseKeys: string[];
}

/**
 * The namespace an application that names none gets.
 *
 * Bare `loopstack`, because the namespace is the **prefix** and the facet is added to it: this yields
 * `loopstack.workspace`, `loopstack.workflow` and `loopstack.run`, where `loopstack.workspace` would have
 * yielded `loopstack.workspace.workspace`.
 */
export const DEFAULT_NAMESPACE = 'loopstack';

/** DI token for the resolved options. */
export const CODE_WORKSPACE_OPTIONS = Symbol('CODE_WORKSPACE_OPTIONS');

export function resolveCodeWorkspaceOptions(options?: CodeWorkspaceOptions): ResolvedCodeWorkspaceOptions {
  return {
    agentPort: options?.agentPort ?? 3001,
    stateDir: options?.stateDir,
    namespace: options?.namespace ?? DEFAULT_NAMESPACE,
    knownBaseKeys: options?.knownBaseKeys ?? [],
  };
}
