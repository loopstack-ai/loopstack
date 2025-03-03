import { TransitionPayloadInterface } from '../../state-machine/interfaces/transition-payload.interface';
import {NamespaceEntity} from "../../persistence/entities/namespace.entity";

export interface ProcessRunInterface {
  userId: string | null;
  projectId: string;
  model: string;
  workspaceId: string;
  namespaces: NamespaceEntity[];

  transition?: TransitionPayloadInterface;
}
