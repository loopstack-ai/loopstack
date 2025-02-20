import { UtilInterface } from './util.interface';
import { FunctionFromInterface } from './function-from.interface';
import { NamedCollectionItem } from './named-collection-item.interface';

export interface PipelineInterface extends NamedCollectionItem {
  name: string;
  options?: {
    contextCarryOver?: boolean;
  };
  sequence?: {
    name: string;
  }[];
  factory?: {
    pipeline: string;
    props: {
      name: string | FunctionFromInterface;
    };
  };
  before?: UtilInterface[];
  after?: UtilInterface[];
}
