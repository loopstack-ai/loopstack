import { WorkflowTransitionInterface } from './workflow-transition.interface';
import { WorkflowObserverInterface } from './workflow-observer.interface';

export interface WorkflowTemplateInterface {
  name: string;
  extends?: string;
  transitions: WorkflowTransitionInterface[];
  observers: WorkflowObserverInterface[];
}
