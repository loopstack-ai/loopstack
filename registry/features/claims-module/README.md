# @loopstack/claims

Resource claims for Loopstack workflows. A workflow that must not run beside another says so by claiming a
resource; a claim is a row that lives as long as the run or the workspace it is scoped to.

One primitive covers a mutex, a pool of N, and a reader/writer lock:

| want                      | how                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------- |
| a resource claimable once | any key, claimed `exclusive`                                                           |
| five workers              | a key with `capacity: 5`, claimed `shared`                                             |
| many readers, one writer  | a key with `capacity: null`, claimed `shared` by readers and `exclusive` by the writer |

## Install

```bash
npm install @loopstack/claims
```

Requires PostgreSQL — the claim transaction takes a `pg_advisory_xact_lock` per resource — and a root
`TypeOrmModule.forRoot()` whose schema includes `ResourceClaimEntity`.

## Register

```ts
import { ClaimsModule } from '@loopstack/claims';

@Module({
  imports: [
    ClaimsModule.forRoot({
      resources: [
        { key: 'engineer:runs', capacity: 6 },
        { key: 'area:core', capacity: null },
      ],
    }),
  ],
})
export class AppModule {}
```

A key that is not listed has capacity **1**, which is what lets a key be invented on demand —
`pkg:@loopstack/core`, `area:234` — and still be claimable exactly once. Capacity is configured and never
passed with a claim: two callers disagreeing about the size of a pool would be a bug with no right answer.

## Claim

```ts
const result = await this.claims.claim({
  claimedByWorkflowId: ctx.workflowId,
  label: 'loopstack#432',
  resources: [
    { key: 'engineer:runs', mode: 'shared', scope: 'workflow', workspaceId, scopeWorkflowId: runId },
    { key: 'area:core', mode: 'shared', scope: 'workflow', workspaceId, scopeWorkflowId: runId },
    { key: 'pkg:@loopstack/core', mode: 'exclusive', scope: 'workflow', workspaceId, scopeWorkflowId: runId },
    { key: 'engineer:checkouts', mode: 'shared', scope: 'workspace', workspaceId },
  ],
});

if (!result.claimed) {
  // result.blocked names each resource, its capacity, why, and who holds it.
}
```

Three properties worth knowing before you use it:

- **All or nothing.** Every resource in the request, or none. The list may mix scopes, which is the point: one
  decision can take a unit of a pool for a workspace and a set of areas for a run.
- **Idempotent per resource and scope target.** Claiming a resource an owner already holds, in the same mode,
  succeeds and writes nothing. So two callers can claim the same thing for the same owner without either
  knowing about the other — a coordinator claiming on a run's behalf and the run claiming for itself.
- **It never waits.** There is no blocking acquire: a task that waits inside its transition holds a queue slot
  and its workspace lock while doing nothing. A claim either succeeds now or says what blocked it, and the
  caller decides whether to hold back, park and try later, or report it.

## Scope: how long a claim lives

```ts
type ClaimScope = 'workflow' | 'workspace';
```

- `workflow` — as long as one run. Released when that run settles or is deleted.
- `workspace` — as long as the workspace. Released when the workspace is deleted, whatever happens to the run
  that took it.

Scope is declared rather than inferred from who claimed, because the two come apart: a run may take a claim
meant to outlive it. `claimedByWorkflowId` records who took it and releases nothing.

Scope governs **automatic** release only. Any caller may release early, by claim id, by the run a claim is
scoped to, or by workspace.

## A claim cannot be left behind

Every read reconciles against the scope target: a claim scoped to a run that has settled or been deleted, or
to a workspace that is gone, is ignored. A crashed holder, a cascade delete that emitted no event, a missed
event, a process that died between claiming and releasing — none of them hold a resource.

The listeners on `workflow.settled`, `workflow.deleted` and `workspace.deleted` mark those rows released so a
report reads cleanly. Correctness does not depend on the events arriving.

## Read

```ts
const states = await this.claims.availability(['engineer:runs', 'area:core']);
// [{ key, capacity, holders: [{ scope, scopeWorkflowId, workspaceId, label, since, mode }], free }]

const held = await this.claims.heldBy({ workspaceId });
```

`free` is the shared units left — `null` when the capacity is unlimited, and `0` while an exclusive holder has
it however large the capacity.

Availability is **advisory**: between reading it and claiming, anything may change. It is what a decision is
made from; the claim is what makes the decision real. `GET /api/v1/workspaces/:workspaceId/claims` lists what
a workspace holds, for answering "why has nothing started" without running a workflow to ask.

## Tools

`claim_resource`, `release_resource` and `check_resources` wrap the service for workflows that prefer the tool
pipeline. They are host-side tools: a claim decides what may run beside what, which is not an agent's
decision, so do not expose them to one.
