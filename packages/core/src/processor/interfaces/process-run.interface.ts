import { TransitionPayloadInterface } from '@loopstack/shared';

export interface ProcessRunInterface {
  userId: string | null;
  projectId: string;
  transition?: TransitionPayloadInterface;
}
