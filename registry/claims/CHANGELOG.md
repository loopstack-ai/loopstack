# @loopstack/claims

## 0.1.0

### Minor Changes

- [#435](https://github.com/loopstack-ai/loopstack/pull/435) [`c6a1c35`](https://github.com/loopstack-ai/loopstack/commit/c6a1c3575081f846cea34d3095be63f825511ca7) Thanks [@jakobklippel](https://github.com/jakobklippel)! - New registry package: resource claims.

  A workflow that must not run beside another claims a resource; a claim is a row that lives as long as the run or
  the workspace it is scoped to. One primitive serves a mutex, a pool of N and a reader/writer lock — a key with
  `capacity` and a claim with `mode: 'exclusive' | 'shared'`.
  - `ClaimsModule.forRoot({ resources })` declares the keys whose capacity is not one; an unlisted key has
    capacity 1, so a key can be invented on demand and still be claimable exactly once. Capacity is configured,
    never passed with a claim.
  - `ResourceClaimService.claim()` takes every resource in a request or none of them, may mix scopes in one call,
    is idempotent per resource and scope target, and never waits — it either succeeds or reports what blocked it,
    with the holders. `release()`, `availability()` and `heldBy()` complete the surface, with
    `claim_resource` / `release_resource` / `check_resources` as tools and a read-only REST listing per workspace.
  - A claim cannot be left behind: every read ignores a claim whose scope target has settled or been deleted, so a
    crashed holder, a missed event or a cascade delete frees the resource by itself. The listeners on
    `workflow.settled`, `workflow.deleted` and `workspace.deleted` only mark those rows released.
  - Requires PostgreSQL: the claim transaction takes a `pg_advisory_xact_lock` per resource key, in sorted order.

### Patch Changes

- Updated dependencies [[`2ea921f`](https://github.com/loopstack-ai/loopstack/commit/2ea921f59e64f3aa6208ac5e429f085725865522), [`c4639e8`](https://github.com/loopstack-ai/loopstack/commit/c4639e8ca6d7fd4f423b4befb160890d1b52e20c)]:
  - @loopstack/common@0.45.0
  - @loopstack/core@0.45.0
