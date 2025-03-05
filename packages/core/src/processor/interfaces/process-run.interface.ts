import { TransitionPayloadInterface } from '@loopstack/shared';

export interface ProcessRunInterface {
  userId: string | null;
  projectId: string;
  model: string;
  workspaceId: string;

  labels: string[];
  transition?: TransitionPayloadInterface;
}
