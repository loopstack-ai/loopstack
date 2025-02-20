import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import {ProjectConfigInterface} from "@loopstack/shared";

@Injectable()
export class ProjectCollectionService extends CollectionService<ProjectConfigInterface> {
  create(projects: ProjectConfigInterface[]): void {
    this.merge(projects);
  }
}
