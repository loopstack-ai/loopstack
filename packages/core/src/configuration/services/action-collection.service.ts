import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import {ActionConfigInterface} from "@loopstack/shared";

@Injectable()
export class ActionCollectionService extends CollectionService<ActionConfigInterface> {
  create(actions: ActionConfigInterface[]): void {
    this.merge(actions);
  }
}
