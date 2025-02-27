import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import {ToolWrapperConfigInterface} from "@loopstack/shared";

@Injectable()
export class ToolWrapperCollectionService extends CollectionService<ToolWrapperConfigInterface> {
  create(tools: ToolWrapperConfigInterface[]): void {
    this.merge(tools);
  }
}
