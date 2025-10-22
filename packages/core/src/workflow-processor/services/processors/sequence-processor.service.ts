import { Injectable, Logger } from '@nestjs/common';
import { Processor } from '../../interfaces/processor.interface';
import { ProcessorFactory } from '../processor.factory';
import { Pipeline } from '../../abstract';
import {
  PipelineItemConfigType,
  PipelineItemSchema,
  PipelineItemType,
  PipelineSequenceType,
} from '@loopstack/shared';
import { BlockHelperService } from '../block-helper.service';
import { TemplateExpressionEvaluatorService } from '../template-expression-evaluator.service';
import { BlockFactory } from '../block.factory';
import { BlockProcessor } from '../block-processor.service';
import { PipelineExecutionContextDto } from '../../dtos';

@Injectable()
export class SequenceProcessorService implements Processor {
  private readonly logger = new Logger(SequenceProcessorService.name);

  constructor(
    private readonly blockFactory: BlockFactory,
    private readonly blockProcessor: BlockProcessor,
    private readonly blockHelperService: BlockHelperService,
    private readonly templateExpressionEvaluatorService: TemplateExpressionEvaluatorService,
  ) {}

  async process(block: Pipeline, factory: ProcessorFactory): Promise<Pipeline> {
    block = await this.blockHelperService.initBlockNamespace(block);

    this.logger.debug(`Running Sequence: ${block.name}`);

    const config = block.config as unknown as PipelineSequenceType;
    const sequence: PipelineItemConfigType[] = config.sequence;

    this.logger.debug(`Processing sequence with ${sequence.length} items.`);

    // create a new index level
    const index = `${block.ctx.index}.0`;

    for (let i = 0; i < sequence.length; i++) {
      const item: PipelineItemConfigType = sequence[i];

      const parsedItem =
        this.templateExpressionEvaluatorService.evaluateTemplate<PipelineItemType>(
          item,
          block,
          ['pipeline'],
          PipelineItemSchema,
        );

      if (undefined !== parsedItem.condition && !parsedItem.condition) {
        this.logger.debug(
          `Skipping execution due to condition: ${parsedItem.id}`,
        );
        continue;
      }

      const currentIndex = this.blockHelperService.createIndex(index, i + 1);

      const childBlock = await this.blockFactory.createBlock<
        Pipeline,
        PipelineExecutionContextDto
      >(
        parsedItem.block,
        {
          ...parsedItem.args,
          index: currentIndex,
        },
        {
          ...block.ctx,
          index: currentIndex,
        },
      );

      const processedBlock = await this.blockProcessor.processBlock(
        childBlock,
        factory,
      );
      const resultData = processedBlock.getResult();

      if (parsedItem.id) {
        block.addStepResult(parsedItem.id, resultData);
      }
      block.addStepResult(i.toString(), resultData);

      if (processedBlock.state?.stop) {
        block.state.stop = true;
        this.logger.debug(`Stopping sequence due to stop sign.`);
        break;
      }
    }

    this.logger.debug(`Processed all sequence items.`);
    return block;
  }
}
