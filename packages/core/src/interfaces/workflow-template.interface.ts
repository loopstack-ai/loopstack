import { WorkflowTransitionInterface } from './workflow-transition.interface.js';
import { WorkflowObserverInterface } from './workflow-observer.interface.js';

export interface WorkflowTemplateInterface {
  name: string;
  extends?: string;
  transitions: WorkflowTransitionInterface[];
  observers: WorkflowObserverInterface[];
}
