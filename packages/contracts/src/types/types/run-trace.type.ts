import { z } from 'zod';

// ---------------------------------------------------------------------------
// Run trace — the canonical, append-only event journal of one workflow run.
// Purely observational: the engine never reads it. Consumers are tests,
// debugging tooling, coverage collection, and (later) the Studio timeline.
// Ordering is guaranteed by `seq`; `ts` is wall-clock epoch milliseconds.
// ---------------------------------------------------------------------------

const RunTraceEventBase = {
  /** Per-run monotonic sequence number — the ordering guarantee. */
  seq: z.number().int(),
  /** Wall-clock timestamp (epoch ms). Informational; ordering comes from `seq`. */
  ts: z.number(),
};

/** A shallow per-key change of workflow state produced by one transition. */
export const StateDiffSchema = z.record(
  z.string(),
  z.object({ before: z.unknown().optional(), after: z.unknown().optional() }),
);
export type StateDiff = z.infer<typeof StateDiffSchema>;

export const TransitionStartedEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('transition.started'),
  transitionId: z.string(),
  from: z.string().nullable(),
  to: z.string(),
  /** Wait transitions: the submitted payload. Absent on auto transitions. */
  payload: z.unknown().optional(),
});

export const TransitionCompletedEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('transition.completed'),
  transitionId: z.string(),
  durationMs: z.number(),
  /** Shallow key diff of the state before vs. after the transition. */
  stateDiff: StateDiffSchema,
  /** Whether the transition touched the workflow's published result. */
  resultDirty: z.boolean(),
});

export const TransitionFailedEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('transition.failed'),
  transitionId: z.string(),
  /** Absent when the failure arrived as a sub-workflow failure callback (the body never ran). */
  durationMs: z.number().optional(),
  error: z.string(),
  retryCount: z.number(),
  willRetry: z.boolean(),
});

export const ToolCalledEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('tool.called'),
  transitionId: z.string().optional(),
  toolName: z.string(),
  /** 0-based order of this call within its transition. */
  toolSeq: z.number(),
  args: z.unknown().optional(),
  /** The call's validated config, when the tool was called with one. */
  config: z.unknown().optional(),
});

export const ToolCompletedEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('tool.completed'),
  transitionId: z.string().optional(),
  toolName: z.string(),
  toolSeq: z.number(),
  /** The validated args of the call — repeated here so the event is self-contained (fixture derivation). */
  args: z.unknown().optional(),
  /** The call's validated config, when the tool was called with one. */
  config: z.unknown().optional(),
  /** The full ToolEnvelope the pipeline returned. */
  envelope: z.unknown(),
  durationMs: z.number(),
});

export const ToolFailedEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('tool.failed'),
  transitionId: z.string().optional(),
  toolName: z.string(),
  toolSeq: z.number(),
  args: z.unknown().optional(),
  config: z.unknown().optional(),
  error: z.string(),
  durationMs: z.number(),
});

export const DocumentEmittedEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('document.emitted'),
  transitionId: z.string().optional(),
  documentId: z.string().optional(),
  key: z.string().optional(),
  documentName: z.string(),
  /** Set when saving this document invalidated previous versions under the same key. */
  invalidatedKey: z.string().optional(),
});

export const ChildQueuedEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('child.queued'),
  transitionId: z.string().optional(),
  childWorkflowId: z.string(),
  workflowName: z.string(),
  show: z.string().optional(),
});

export const ChildSettledEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('child.settled'),
  childWorkflowId: z.string(),
  status: z.string(),
});

export const RunSettledEventSchema = z.object({
  ...RunTraceEventBase,
  type: z.literal('run.settled'),
  status: z.string(),
  place: z.string(),
  /** Transition ids the run is waiting on — present on waiting settles (parks). */
  availableTransitions: z.array(z.string()).optional(),
});

/**
 * One event of a run's trace — the discriminated union over all event kinds.
 *
 * @public
 */
export const RunTraceEventSchema = z.discriminatedUnion('type', [
  TransitionStartedEventSchema,
  TransitionCompletedEventSchema,
  TransitionFailedEventSchema,
  ToolCalledEventSchema,
  ToolCompletedEventSchema,
  ToolFailedEventSchema,
  DocumentEmittedEventSchema,
  ChildQueuedEventSchema,
  ChildSettledEventSchema,
  RunSettledEventSchema,
]);

/**
 * A run trace event, inferred from {@link RunTraceEventSchema}.
 *
 * @public
 */
export type RunTraceEvent = z.infer<typeof RunTraceEventSchema>;

export type TransitionStartedEvent = z.infer<typeof TransitionStartedEventSchema>;
export type TransitionCompletedEvent = z.infer<typeof TransitionCompletedEventSchema>;
export type TransitionFailedEvent = z.infer<typeof TransitionFailedEventSchema>;
export type ToolCalledEvent = z.infer<typeof ToolCalledEventSchema>;
export type ToolCompletedEvent = z.infer<typeof ToolCompletedEventSchema>;
export type ToolFailedEvent = z.infer<typeof ToolFailedEventSchema>;
export type DocumentEmittedEvent = z.infer<typeof DocumentEmittedEventSchema>;
export type ChildQueuedEvent = z.infer<typeof ChildQueuedEventSchema>;
export type ChildSettledEvent = z.infer<typeof ChildSettledEventSchema>;
export type RunSettledEvent = z.infer<typeof RunSettledEventSchema>;

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

/** A trace event before the collector assigns `seq` and `ts`. */
export type RunTraceEventInput = DistributiveOmit<RunTraceEvent, 'seq' | 'ts'>;

/**
 * The transitions a trace shows as actually executed — every `transition.completed`
 * and `transition.failed` event, in order. The shared derivation behind `path`-style
 * views of a run.
 *
 * @public
 */
export function executedTransitions(trace: RunTraceEvent[]): Array<TransitionCompletedEvent | TransitionFailedEvent> {
  return trace.filter(
    (e): e is TransitionCompletedEvent | TransitionFailedEvent =>
      e.type === 'transition.completed' || e.type === 'transition.failed',
  );
}
