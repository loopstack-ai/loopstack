import { Expose } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WorkflowStateHistoryDto, WorkflowStatePlaceInfoDto } from "@loopstack/core";

/**
 * Data Transfer Object representing the state of a workflow
 */
export class WorkflowStateDto {
    /**
     * Unique identifier for the workflow state
     */
    @Expose()
    @ApiProperty({
        description: 'Unique identifier for the workflow state',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    /**
     * Current place in the workflow state machine
     */
    @Expose()
    @ApiProperty({
        description: 'Current place in the workflow state machine',
        example: 'approval_pending'
    })
    place: string;

    /**
     * Additional information about the current place in the workflow
     */
    @Expose()
    @ApiPropertyOptional({
        type: WorkflowStatePlaceInfoDto,
        description: 'Additional information about the current place in the workflow',
        nullable: true
    })
    placeInfo: WorkflowStatePlaceInfoDto | null;

    /**
     * History of state transitions within the workflow
     */
    @Expose()
    @ApiPropertyOptional({
        type: WorkflowStateHistoryDto,
        description: 'History of state transitions within the workflow',
        nullable: true
    })
    transitionHistory: WorkflowStateHistoryDto | null;

    /**
     * Timestamp when the workflow state was created
     */
    @Expose()
    @ApiProperty({
        type: Date,
        description: 'Timestamp when the workflow state was created',
        example: '2023-01-01T00:00:00Z'
    })
    createdAt: Date;

    /**
     * Timestamp when the workflow state was last updated
     */
    @Expose()
    @ApiProperty({
        type: Date,
        description: 'Timestamp when the workflow state was last updated',
        example: '2023-01-02T00:00:00Z'
    })
    updatedAt: Date;
}