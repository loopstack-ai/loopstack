import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { ToolConfigDefaultType } from '../schemas/tool-config.schema';

@Injectable()
export class ToolWrapperCollectionService extends CollectionService<ToolConfigDefaultType> {
  create(tools: ToolConfigDefaultType[]): void {
    this.merge(tools);
  }
}
