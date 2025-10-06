import { Injectable } from '@nestjs/common';
import { AssignmentConfigType } from '@loopstack/shared';
import { Block } from '../abstract/block.abstract';
import { TemplateExpressionEvaluatorService } from './template-expression-evaluator.service';

@Injectable()
export class BlockHelperService {

  constructor(
    private templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  assignToTargetBlock(
    assign: AssignmentConfigType | undefined,
    block: Block,
    parentBlock: Block,
  ) {
    if (assign) {
      for (const [scopedKey, value] of Object.entries(assign)) {
        try {
          const parts = scopedKey.split('.');
          const scope = parts[0];
          const variableName = parts.slice(1).join('.');

          if (scope !== 'parent' && scope !== 'this') {
            throw new Error(`Invalid scope "${scope}". Must be "parent" or "this"`);
          }

          const targetBlock = scope === 'parent' ? parentBlock : block;
          if (!targetBlock) {
            throw new Error(`Cannot assign to ${scope}: target block does not exist`);
          }

          targetBlock[variableName] = this.templateExpressionEvaluatorService.parse<string>(
            value,
            {
              this: block,
              parent: parentBlock,
            }
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