import { Injectable } from '@nestjs/common';
import { AssignmentConfigType } from '@loopstack/shared';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';
import { Block } from '../abstract/block.abstract';

@Injectable()
export class BlockHelperService {

  constructor(
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  assignToTargetBlock(
    assign: AssignmentConfigType | undefined,
    targets: Record<string, Block>,
  ) {
    if (assign) {

      const outputTargets = Object.entries(targets).reduce((acc, [key, block]) => {
        acc[key] = block.toOutputObject();
        return acc;
      }, {} as Record<string, any>);

      for (const [scopedKey, value] of Object.entries(assign)) {
        try {
          const parts = scopedKey.split('.');
          const scope = parts[0];
          const variableName = parts.slice(1).join('.');

          const availableKeys = Object.keys(targets);
          if (!availableKeys.includes(scope)) {
            throw new Error(`Invalid scope "${scope}". Must be one of: ${availableKeys.join(' | ')}`);
          }

          const targetBlock = targets[scope];
          if (!targetBlock) {
            throw new Error(`Cannot assign to ${scope}: target block does not exist`);
          }

          if (!targetBlock.isInputProperty(variableName)) {
            throw new Error(`Property ${variableName} is not a valid input. Mark input properties with @Input() decorator.`)
          }

          targetBlock[variableName] = this.templateExpressionEvaluatorService.parse<string>(
            value,
            outputTargets
          );

        } catch (error) {
          throw new Error(
            `Failed to assign ${scopedKey}: ${error.message}`,
            { cause: error }
          );
        }
      }
    }
  }
}