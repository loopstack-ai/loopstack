import { NamespaceEntity } from '../../persistence/entities/namespace.entity';
import {TransitionPayloadInterface} from "@loopstack/shared";

export interface ProcessRunInterface {
  userId: string | null;
  projectId: string;
  model: string;
  workspaceId: string;
  namespaces: NamespaceEntity[];

  transition?: TransitionPayloadInterface;
}
