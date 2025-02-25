import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import {ToolWrapperConfigInterface} from "@loopstack/shared/dist/schemas/toolWrapperSchema";

@Injectable()
export class ToolWrapperCollectionService extends CollectionService<ToolWrapperConfigInterface> {
  create(tools: ToolWrapperConfigInterface[]): void {
    this.merge(tools);
  }
}
