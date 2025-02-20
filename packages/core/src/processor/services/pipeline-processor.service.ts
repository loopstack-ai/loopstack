import {Injectable} from "@nestjs/common";
import {PipelineCollectionService} from "../../configuration/services/pipeline-collection.service";
import {WorkflowProcessorService} from "./workflow-processor.service";
import {PipelineConfigInterface} from "@loopstack/shared";

@Injectable()
export class PipelineProcessorService {

    constructor(
        private pipelineCollectionService: PipelineCollectionService,
        private workflowProcessorService: WorkflowProcessorService,
    ) {}

    hasPipeline(name: string): boolean {
        return this.pipelineCollectionService.has(name);
    }

    getSequence(pipeline: PipelineConfigInterface): any[] {
        if (undefined === pipeline.sequence) {
            const factory = pipeline.factory;
            if (undefined === factory) {
                throw new Error(`pipeline has no sequence or factory defined.`);
            }

            throw 'factory not implemented';
        }

        return pipeline.sequence;
    }

    async processPipeline(name: string): Promise<any[]> {
        console.log('Processing pipeline:', name);

        const pipeline = this.pipelineCollectionService.getByName(name);
        if (!pipeline) {
            throw new Error(`pipeline with name "${name}" not found.`);
        }

        const results: any[] = [];
        for (const item of this.getSequence(pipeline)) {
            if (this.hasPipeline(item.name)) {
                const result = await this.processPipeline(item.name);
                results.push(result);
                continue;
            }

            if (this.workflowProcessorService.hasWorkflow(item.name)) {
                results.push(await this.workflowProcessorService.processWorkflow(item.name));
                continue;
            }

            throw new Error(`workflow or pipeline with name "${item.name}" not found.`);
        }

        return results;
    }
}