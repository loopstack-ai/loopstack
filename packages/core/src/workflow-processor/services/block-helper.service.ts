import { Injectable } from '@nestjs/common';
import type { AssignmentConfigType } from '@loopstack/contracts/types';
import { Tool, Workflow } from '../abstract';
import { WorkflowEntity } from '@loopstack/common';
import {
  TemplateExpressionEvaluatorService,
  WorkflowStateDto,
} from '../../common';
import { WorkflowStateService } from './workflow-state.service';

@Injectable()
export class BlockHelperService {
  constructor(
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
    private workflowStateService: WorkflowStateService,
  ) {}

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
            throw new Error(
              `Property ${key} is not a valid input. Mark input properties with @Input() decorator.`,
            );
          }

          target[key] =
            this.templateExpressionEvaluatorService.evaluateTemplateRaw<string>(
              value,
              source,
            );
        } catch (error) {
          throw new Error(`Failed to assign ${key}: ${error.message}`, {
            cause: error,
          });
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

      persistenceState: {
        documentsUpdated: false,
      },
    });
  }

  populateBlockInputProperties(
    block: Workflow,
    inputData: Record<string, any>,
  ) {
    const classInputProps = block.metadata.inputProperties;
    for (const propertyName of classInputProps) {
      if (propertyName in inputData) {
        block[propertyName] = inputData[propertyName];
      }
    }
  }

  exportBlockInputProperties(block: Workflow) {
    const classInputProps = block.metadata.inputProperties;
    const exportData: Record<string, any> = {};
    for (const propertyName of classInputProps) {
      if (propertyName in block) {
        exportData[propertyName] = block[propertyName];
      }
    }

    return exportData;
  }

  async persistBlockState(workflowEntity: WorkflowEntity, block: Workflow) {
    workflowEntity.history = block.state.history ?? null;
    workflowEntity.place = block.state.place;
    workflowEntity.transitionResults = block.state.transitionResults ?? null;
    workflowEntity.documents = block.state.documents;
    workflowEntity.hasError = block.state.error;
    workflowEntity.inputData = this.exportBlockInputProperties(block);

    // persist available transitions for frontend
    workflowEntity.availableTransitions =
      block.state.availableTransitions ?? null;

    await this.workflowStateService.saveWorkflowState(
      workflowEntity,
      block.state.persistenceState,
    );
  }
}
