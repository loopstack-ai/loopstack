/**
 * DI token for the thing that knows which repositories a workspace holds, registered by the application.
 *
 * @public
 */
export const GIT_REPOSITORY_SOURCE = 'GIT_REPOSITORY_SOURCE';

/**
 * One repository of a workspace, as the application declared it.
 *
 * `dir` is what every git call addresses: a path relative to the workspace root, empty for the root itself.
 * `key` is the name the application knows it by, which is what a user picking between repositories reads.
 *
 * @public
 */
export interface GitRepository {
  key: string;
  dir: string;
  /** Absent for a repository that was initialised rather than cloned. */
  url?: string;
  branch?: string;
  /** The one to work on unless the caller says otherwise. */
  primary?: boolean;
}

/**
 * Where the workspace git endpoints learn which repositories exist.
 *
 * A workspace can hold several repositories in one tree, and git itself cannot say which ones an application
 * put there on purpose — a tree walk would find every `.git` directory, including those of dependencies and
 * fixtures, and could not say which is the primary one. So the application that created the checkout declares
 * them, by providing this under {@link GIT_REPOSITORY_SOURCE}:
 *
 * ```ts
 * @Injectable()
 * class CheckoutRepositories implements GitRepositorySource {
 *   constructor(@Inject(CODE_WORKSPACE_PROVISIONER) private readonly workspace: CodeWorkspaceProvisioner) {}
 *   list(workspaceId: string): GitRepository[] {
 *     return this.workspace.listRepos(workspaceId);
 *   }
 * }
 * ```
 *
 * Nothing has to provide it: without one, `GET .../git/repos` answers with an empty list, which reads as "one
 * repository, at the root" — what a workspace with a single checkout wants anyway.
 *
 * @public
 */
export interface GitRepositorySource {
  list(workspaceId: string): Promise<GitRepository[]> | GitRepository[];
}
