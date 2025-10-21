import { Injectable } from '@nestjs/common';
import {
  AssignmentConfigType,
  HandlerCallResult, NamespacePropsSchema, NamespacePropsType,
  PipelineFactoryConfigType,
  PipelineSequenceType, WorkflowEntity,
} from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { Factory, Pipeline, Tool, Workflow } from '../abstract';
import { NamespaceProcessorService } from './namespace-processor.service';
import { WorkflowStateDto } from '../dtos/workflow-state.dto';

@Injectable()
export class BlockHelperService {

  constructor(
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private namespaceProcessorService: NamespaceProcessorService,
  ) {}

  async initBlockNamespace<T extends Pipeline | Factory>(block: T): Promise<T> {
    const config: PipelineSequenceType | PipelineFactoryConfigType = block.config as any;

    if (config.namespace) {

      const namespaceConfig = this.templateExpressionEvaluatorService.evaluateTemplate<NamespacePropsType>(
        config.namespace,
        block,
        ['pipeline'],
        NamespacePropsSchema,
      );

      block.ctx.namespace = await this.namespaceProcessorService.createNamespace(
        block,
        namespaceConfig,
      );
      block.ctx.labels = [...block.ctx.labels, block.ctx.namespace.name];
    }

    return block;
  }

  createIndex(ltreeIndex: string, increment: number = 1): string {
    const parts = ltreeIndex.split('.').map(Number);
    parts[parts.length - 1] += increment;
    return parts.map((part) => part.toString().padStart(4, '0')).join('.');
  }

  assignToTargetBlock(
    assign: AssignmentConfigType | undefined,
    target: Workflow,
    source: Tool,
  ) {
    if (assign) {

      for (const [key, value] of Object.entries(assign)) {
        try {
          if (!target.isInputProperty(target.metadata, key)) {
            throw new Error(`Property ${key} is not a valid input. Mark input properties with @Input() decorator.`)
          }

          target[key] = this.templateExpressionEvaluatorService.evaluateTemplateRaw<string>(
            value,
            source,
          );

        } catch (error) {
          throw new Error(
            `Failed to assign ${key}: ${error.message}`,
            { cause: error }
          );
        }
      }
    }
  }

  initBlockState(workflowEntity: WorkflowEntity): WorkflowStateDto {
    return new WorkflowStateDto({
      // init with persisted state:
      id: workflowEntity.id,
      history: workflowEntity.history ?? [],
      place: workflowEntity.place,
      transitionResults: workflowEntity.transitionResults,
      documents: workflowEntity.documents,

      // init with defaults:
      error: false,
      stop: false,
      transition: undefined,
      availableTransitions: null, // will be evaluated at workflow loop
      currentTransitionResults: null,
    })
  }

  persistBlockState(workflowEntity: WorkflowEntity, state: WorkflowStateDto) {
    workflowEntity.history = state.history ?? null;
    workflowEntity.place = state.place;
    workflowEntity.transitionResults = state.transitionResults ?? null;
    workflowEntity.documents = state.documents;
    workflowEntity.hasError = state.error;

    // persist available transitions for frontend
    workflowEntity.availableTransitions = state.availableTransitions ?? null;
  }
}