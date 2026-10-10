import type { ParkView } from '@loopstack/contracts/park-view';

export interface RunPromptProps {
  view: ParkView;
  /** Submits an answer; `transitionId` defaults to the view's `defaultTransition`. */
  submit: (payload: unknown, transitionId?: string) => void;
  isSubmitting: boolean;
  /** The run's workspace — needed by prompts with side effects beyond the transition (secrets). */
  workspaceId?: string;
}
