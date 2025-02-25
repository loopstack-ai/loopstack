import { TransitionPayloadInterface } from '../../state-machine/interfaces/transition-payload.interface';

export interface ProcessRunInterface {
  userId: string | null;
  projectId: string;
  workspaceId: string;

  transition?: TransitionPayloadInterface;
}
