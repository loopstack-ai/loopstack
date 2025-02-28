import {Expose, plainToInstance, Transform} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {NamespacesType, WorkflowEntity} from "@loopstack/core";

export class WorkflowItemDto {
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
    index: number;

    @Expose()
    @ApiProperty()
    progress: number;

    @Expose()
    @ApiProperty()
    error: string | null;

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
    @Transform(({ obj }) => obj.state?.place || null)
    place: string | null;

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