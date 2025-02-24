import { ContextInterface } from './context.interface';
import {WorkflowState} from "../../persistence/entities/workflow-state.entity";

export interface ResultInterface {
  context: ContextInterface;
  lastState?: WorkflowState;
}
