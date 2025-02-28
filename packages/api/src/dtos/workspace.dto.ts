import {Exclude, Expose, plainToInstance} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {WorkspaceEntity} from "@loopstack/core/dist/persistence/entities/workspace.entity";

export class WorkspaceDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    isLocked: boolean;

    @Expose()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @Expose()
    @ApiProperty({ type: Date })
    updatedAt: Date;

    @Exclude()
    createdBy: string | null;

    static create(workspace: WorkspaceEntity) {
        return plainToInstance(WorkspaceDto, workspace, {
            excludeExtraneousValues: true,
        })
    }
}