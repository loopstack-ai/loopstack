import { UtilInterface } from './util.interface.js';
import { FunctionFromInterface } from './function-from.interface.js';
import { NamedCollectionItem } from './named-collection-item.interface';

export interface PipelineInterface extends NamedCollectionItem {
  name: string;
  options?: {
    contextCarryOver?: boolean;
  };
  sequence?: {
    type: 'Workflow' | 'Pipeline';
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
