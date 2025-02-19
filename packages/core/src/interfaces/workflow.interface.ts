import {WorkflowTemplateInterface} from "./workflow-template.interface.js";
import {WorkflowTransitionInterface} from "./workflow-transition.interface.js";
import {WorkflowObserverInterface} from "./workflow-observer.interface.js";
import {UtilInterface} from "./util.interface.js";

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