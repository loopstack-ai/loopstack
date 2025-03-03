import { Expose, plainToInstance } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { ProjectEntity } from "@loopstack/core";
import { ProjectStatus } from "@loopstack/shared";

/**
 * Data Transfer Object for Project item listing
 */
export class ProjectItemDto {
    @Expose()
    @ApiProperty({
        description: 'Unique identifier of the project',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @Expose()
    @ApiProperty({
        description: 'System name of the project, used for identification purposes',
        example: 'customer-portal'
    })
    name: string;

    @Expose()
    @ApiProperty({
        description: 'Display title of the project',
        example: 'Customer Portal'
    })
    title: string;

    @Expose()
    @ApiProperty({
        type: 'array',
        items: { type: 'string' },
        description: 'Tags associated with the project for categorization and filtering',
        example: ['frontend', 'customer-facing', 'high-priority']
    })
    labels: string[];

    @Expose()
    @ApiProperty({
        description: 'Order position of the project in listings',
        example: 1
    })
    order: number;

    @Expose()
    @ApiProperty({
        enum: ProjectStatus,
        enumName: 'ProjectStatus',
        description: 'Current status of the project',
    })
    status: ProjectStatus;

    @Expose()
    @ApiProperty({
        type: Date,
        description: 'Timestamp when the project was created',
        example: '2023-01-15T14:30:00Z'
    })
    createdAt: Date;

    @Expose()
    @ApiProperty({
        type: Date,
        description: 'Timestamp when the project was last updated',
        example: '2023-02-20T09:15:30Z'
    })
    updatedAt: Date;

    @Expose()
    @ApiProperty({
        description: 'Identifier of the workspace that contains this project',
        example: '789e4567-e89b-12d3-a456-426614174001'
    })
    workspaceId: string;

    /**
     * Creates a ProjectItemDto instance from a ProjectEntity
     * @param project The source ProjectEntity to transform
     * @returns A new ProjectItemDto instance with values from the ProjectEntity
     */
    static create(project: ProjectEntity): ProjectItemDto {
        return plainToInstance(ProjectItemDto, project, {
            excludeExtraneousValues: true,
        });
    }
}