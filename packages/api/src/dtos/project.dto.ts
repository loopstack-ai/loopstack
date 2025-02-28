import {Exclude, Expose, plainToInstance} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {ProjectEntity} from "@loopstack/core";
import {ProjectStatus} from "@loopstack/shared";
import {NamespacesDto} from "./namespaces.dto";
import {ProjectContextDto} from "./project-context.dto";

export class ProjectDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty({ type: NamespacesDto })
    namespaces: NamespacesDto;

    @Expose()
    @ApiProperty()
    title: string;

    @Expose()
    @ApiProperty({ type: 'array', items: { type: 'string' }})
    labels: string[];

    @Expose()
    @ApiProperty()
    order: number;

    @Expose()
    @ApiProperty({ enum: ProjectStatus })
    status: ProjectStatus;

    @Expose()
    @ApiProperty({ type: ProjectContextDto })
    context: ProjectContextDto;

    @Expose()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @Expose()
    @ApiProperty({ type: Date })
    updatedAt: Date;

    @Expose()
    @ApiProperty()
    workspaceId: string;

    @Exclude()
    createdBy: string | null;

    static create(project: ProjectEntity) {
        return plainToInstance(ProjectDto, project, {
            excludeExtraneousValues: true,
        })
    }
}