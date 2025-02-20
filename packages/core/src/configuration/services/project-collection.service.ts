import { Injectable } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { ProjectInterface } from '../interfaces/project.interface';

@Injectable()
export class ProjectCollectionService extends CollectionService<ProjectInterface> {
  create(projects: ProjectInterface[]): void {
    this.set(projects);
  }
}
