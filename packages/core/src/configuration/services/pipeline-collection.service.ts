import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import {PipelineConfigInterface} from "@loopstack/shared";

@Injectable()
export class PipelineCollectionService extends CollectionService<PipelineConfigInterface> {
  create(pipelines: PipelineConfigInterface[]): void {
    this.merge(pipelines);
  }
}
