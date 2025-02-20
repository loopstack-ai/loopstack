import {Injectable} from "@nestjs/common";
import {WorkflowCollectionService} from "../../configuration/services/workflow-collection.service";

@Injectable()
export class WorkflowProcessorService {

    constructor(
        private workflowCollectionService: WorkflowCollectionService,
    ) {}

    hasWorkflow(name: string): boolean {
        return this.workflowCollectionService.has(name);
    }

    async processWorkflow(name: string): Promise<any> {
        console.log('Processing workflow:', name);

        const workflow = this.workflowCollectionService.getByName(name);
        if (!workflow) {
            throw new Error(`workflow with name "${name}" not found.`);
        }

        return `processed ${workflow.name}`
    }
}