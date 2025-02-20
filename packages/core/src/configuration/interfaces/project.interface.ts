import { NamedCollectionItem } from './named-collection-item.interface';

export interface ProjectInterface extends NamedCollectionItem {
  name: string;
  workspace: string;
  entrypoint: string;
}
