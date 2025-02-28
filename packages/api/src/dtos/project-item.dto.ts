import {Exclude, Expose, plainToInstance} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {NamespacesType, ProjectEntity} from "@loopstack/core";
import {ProjectStatus} from "@loopstack/shared";

export class ProjectItemDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty()
    namespaces: NamespacesType;

    @Expose()
    @ApiProperty()
    title: string;

    @Expose()
    @ApiProperty()
    labels: string[];

    @Expose()
    @ApiProperty()
    order: number;

    @Expose()
    @ApiProperty({ enum: ProjectStatus })
    status: ProjectStatus;

    @Expose()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @Expose()
    @ApiProperty({ type: Date })
    updatedAt: Date;

    @Expose()
    @ApiProperty()
    workspaceId: string;

    static create(project: ProjectEntity) {
        return plainToInstance(ProjectItemDto, project, {
            excludeExtraneousValues: true,
        })
    }
}