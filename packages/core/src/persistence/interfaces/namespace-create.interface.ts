import {NamespaceEntity} from "../entities";

export interface NamespaceCreateInterface {
  name: string;
  projectId: string;
  workspaceId: string;
  model: string;
  parent: NamespaceEntity | null;
  metadata?: Record<string, any>;
  createdBy?: string | null;
}
