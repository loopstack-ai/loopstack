import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { ProjectType } from '../schemas/project.schema';

@Injectable()
export class ProjectCollectionService extends CollectionService<ProjectType> {
  create(projects: ProjectType[]): void {
    this.merge(projects);
  }
}
