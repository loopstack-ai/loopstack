import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { PipelineInterface } from '../interfaces/pipeline.interface';

@Injectable()
export class PipelineCollectionService extends CollectionService<PipelineInterface> {
  create(pipelines: PipelineInterface[]): void {
    this.set(pipelines);
  }
}
