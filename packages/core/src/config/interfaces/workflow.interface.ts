import { WorkflowTemplateInterface } from './workflow-template.interface';
import { WorkflowTransitionInterface } from './workflow-transition.interface';
import { WorkflowObserverInterface } from './workflow-observer.interface';
import { UtilInterface } from './util.interface';

export interface WorkflowInterface {
  name: string;
  title?: string;
  config: {
    template?: WorkflowTemplateInterface;
    transitions?: WorkflowTransitionInterface[];
    observers?: WorkflowObserverInterface[];
    before?: UtilInterface[];
    after?: UtilInterface[];
  };
}
