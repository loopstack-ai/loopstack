import {Injectable} from "@nestjs/common";
import {ProjectCollectionService} from "../../configuration/services/project-collection.service";
import {PipelineProcessorService} from "./pipeline-processor.service";
import {WorkflowProcessorService} from "./workflow-processor.service";

@Injectable()
export class ProjectProcessorService {

    constructor(
        private projectCollectionService: ProjectCollectionService,
        private pipelineProcessorService: PipelineProcessorService,
        private workflowProcessorService: WorkflowProcessorService,
    ) {}

    async processProject(name: string) {
        console.log('Processing project:', name);

        const project = this.projectCollectionService.getByName(name);
        if (!project) {
            throw new Error(`project with name "${name}" not found.`);
        }

        if (this.pipelineProcessorService.hasPipeline(project.entrypoint)) {
            return this.pipelineProcessorService.processPipeline(project.entrypoint);
        }

        if (this.workflowProcessorService.hasWorkflow(project.entrypoint)) {
            return this.workflowProcessorService.processWorkflow(project.entrypoint);
        }

        throw new Error(`workflow or pipeline with name "${project.entrypoint}" not found.`);
    }
}