import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { UtilInterface } from '../interfaces/util.interface';

@Injectable()
export class UtilsCollectionService extends CollectionService<UtilInterface> {
  create(utils: UtilInterface[]): void {
    this.set(utils);
  }
}
