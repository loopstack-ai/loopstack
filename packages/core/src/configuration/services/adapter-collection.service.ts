import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import {AdapterConfigInterface} from "@loopstack/shared";

@Injectable()
export class AdapterCollectionService extends CollectionService<AdapterConfigInterface> {
  create(models: AdapterConfigInterface[]): void {
    this.merge(models);
  }
}
