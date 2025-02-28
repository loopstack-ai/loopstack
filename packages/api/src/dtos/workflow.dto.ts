import {Expose, plainToInstance, Type} from "class-transformer";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {WorkflowStateDto} from "./workflow-state.dto";
import {WorkflowEntity} from "@loopstack/core";
import {NamespacesDto} from "./namespaces.dto";

export class WorkflowDto {
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
    @ApiProperty({ type: () => WorkflowStateDto })
    @Type(() => WorkflowStateDto)
    state: WorkflowStateDto;

    @Expose()
    @ApiProperty()
    stateId: string;

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