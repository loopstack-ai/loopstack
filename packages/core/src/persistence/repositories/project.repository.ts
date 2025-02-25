import {ProjectEntity} from "../entities/project.entity";
import {Repository} from "typeorm";
import {Injectable} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";

@Injectable()
export class ProjectRepository extends Repository<ProjectEntity> {
    constructor(
        @InjectRepository(ProjectEntity)
        repository: Repository<ProjectEntity>
    ) {
        super(repository.target, repository.manager, repository.queryRunner);
    }
}