import {Exclude, Expose, plainToInstance, Type} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {WorkflowStateDto} from "./workflow-state.dto";
import {NamespacesType, WorkflowEntity} from "@loopstack/core";

export class WorkflowDto {
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
    @ApiProperty({ type: () => WorkflowStateDto })
    @Type(() => WorkflowStateDto)
    state: WorkflowStateDto;

    @Expose()
    @ApiProperty()
    stateId: string | null;

    @Expose()
    @ApiProperty()
    projectId: string;

    @Expose()
    @ApiProperty()
    workspaceId: string;

    static create(workflow: WorkflowEntity) {
        return plainToInstance(WorkflowDto, workflow, {
            excludeExtraneousValues: true,
        })
    }
}