import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { ActionConfigDefaultType } from '../../processor/schemas/action.schema';

@Injectable()
export class ActionCollectionService extends CollectionService<ActionConfigDefaultType> {
  create(actions: ActionConfigDefaultType[]): void {
    this.merge(actions);
  }
}
