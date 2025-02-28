import {Expose, plainToInstance, Transform} from "class-transformer";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {WorkflowEntity} from "@loopstack/core";
import {NamespacesDto} from "./namespaces.dto";

export class WorkflowItemDto {
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
    index: number;

    @Expose()
    @ApiProperty()
    progress: number;

    @Expose()
    @ApiPropertyOptional()
    error: string;

    @Expose()
    @ApiProperty()
    isWorking: boolean;

    @Expose()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @Expose()
    @ApiProperty({ type: Date })
    updatedAt: Date;

    @Expose()
    @ApiProperty()
    @Transform(({ obj }) => obj.state?.place || '')
    place: string;

    @Expose()
    @ApiProperty()
    projectId: string;

    @Expose()
    @ApiProperty()
    workspaceId: string;

    static create(workflow: WorkflowEntity) {
        return plainToInstance(WorkflowItemDto, workflow, {
            excludeExtraneousValues: true,
        })
    }
}