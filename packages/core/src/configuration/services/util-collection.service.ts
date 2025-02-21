import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { UtilConfigInterface } from '@loopstack/shared';

@Injectable()
export class UtilCollectionService extends CollectionService<UtilConfigInterface> {
  create(utils: UtilConfigInterface[]): void {
    this.merge(utils);
  }
}
