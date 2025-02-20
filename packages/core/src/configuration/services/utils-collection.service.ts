import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import {UtilConfigInterface} from "@loopstack/shared";

@Injectable()
export class UtilsCollectionService extends CollectionService<UtilConfigInterface> {
  create(utils: UtilConfigInterface[]): void {
    this.set(utils);
  }
}
