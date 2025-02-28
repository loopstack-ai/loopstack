import {Exclude, Expose, plainToInstance} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {NamespacesType, ProjectEntity} from "@loopstack/core";
import {ProjectStatus} from "@loopstack/shared";

export class ProjectDto {
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
    @ApiProperty()
    context: Record<string, any>;

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