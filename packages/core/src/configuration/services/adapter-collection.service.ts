import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { AdapterConfigDefaultType } from '../schemas/adapter.schema';

@Injectable()
export class AdapterCollectionService extends CollectionService<AdapterConfigDefaultType> {
  create(models: AdapterConfigDefaultType[]): void {
    this.merge(models);
  }
}
