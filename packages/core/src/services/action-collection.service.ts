import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { ActionInterface } from '../interfaces/action.interface';

@Injectable()
export class ActionCollectionService extends CollectionService<ActionInterface> {
  create(actions: ActionInterface[]): void {
    this.set(actions);
  }
}
