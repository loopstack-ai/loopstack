import {Expose, plainToInstance, Type} from "class-transformer";
import {ApiProperty, ApiPropertyOptional, ApiExtraModels} from "@nestjs/swagger";
import {WorkflowStateDto} from "./workflow-state.dto";
import {WorkflowEntity} from "@loopstack/core";

/**
 * Data Transfer Object representing a workflow
 */
@ApiExtraModels(WorkflowStateDto)
export class WorkflowDto {
    @Expose()
    @ApiProperty({
        description: 'Unique identifier of the workflow',
        example: '5f8d3a9b-8b5c-4b9e-8c1a-3d9c8e6f7a2b'
    })
    id: string;

    @Expose()
    @ApiProperty({
        description: 'Name of the workflow',
        example: 'DataProcessingWorkflow'
    })
    name: string;

    @Expose()
    @ApiProperty({
        description: 'Index position of the workflow in the project sequence',
        example: 1,
        type: Number
    })
    index: number;

    @Expose()
    @ApiProperty({
        description: 'Completion percentage of the workflow (0-100)',
        example: 75,
        minimum: 0,
        maximum: 100,
        type: Number
    })
    progress: number;

    @Expose()
    @ApiProperty({
        description: 'Error message if workflow execution failed',
        example: 'Failed to connect to external service',
        nullable: true
    })
    error: string | null; //todo do others like this.

    @Expose()
    @ApiProperty({
        description: 'Indicates if the workflow is currently running',
        example: true,
        type: Boolean
    })
    isWorking: boolean;

    @Expose()
    @ApiProperty({
        type: Date,
        description: 'Date and time when the workflow was created',
        example: '2023-01-15T14:30:45.123Z'
    })
    createdAt: Date;

    @Expose()
    @ApiProperty({
        type: Date,
        description: 'Date and time when the workflow was last updated',
        example: '2023-01-16T09:12:33.456Z'
    })
    updatedAt: Date;

    @Expose()
    @ApiProperty({
        type: () => WorkflowStateDto,
        description: 'Current state of the workflow state machine'
    })
    @Type(() => WorkflowStateDto)
    state: WorkflowStateDto;

    @Expose()
    @ApiProperty({
        description: 'Unique identifier of the workflow state',
        example: '7e9d2c8b-6a5f-4e3d-9c2a-1b3e5d7c9a8f'
    })
    stateId: string;

    @Expose()
    @ApiProperty({
        description: 'Unique identifier of the project this workflow belongs to',
        example: '2a1b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p'
    })
    projectId: string;

    @Expose()
    @ApiProperty({
        description: 'Unique identifier of the workspace this workflow belongs to',
        example: '9i8h7g6f-5e4d-3c2b-1a0z-9y8x7w6v5u4t'
    })
    workspaceId: string;

    /**
     * Creates a WorkflowDto instance from a WorkflowEntity
     * @param workflow The workflow entity to transform
     * @returns A new WorkflowDto instance
     */
    static create(workflow: WorkflowEntity): WorkflowDto {
        return plainToInstance(WorkflowDto, workflow, {
            excludeExtraneousValues: true,
        });
    }
}