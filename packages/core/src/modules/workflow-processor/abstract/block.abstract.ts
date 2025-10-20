import {
  BlockMetadata,
} from '@loopstack/shared';
import { instanceToPlain } from 'class-transformer';
import { BlockStateDto } from '../dtos/workflow-state.dto';

export abstract class Block {

  abstract processor: string;

  abstract args: any;

  abstract state: BlockStateDto;

  abstract ctx: any;

  abstract config: any;

  abstract init(args: any, ctx: any, data: Partial<BlockStateDto>): void;

  isInputProperty(metadata: BlockMetadata, name: string) {
    return metadata.inputProperties.includes(name);
  }

  getResult() {
    return instanceToPlain(this, {
      strategy: this.config.classTransformStrategy || 'excludeAll',
      groups: ['result'],
    });
  }
}