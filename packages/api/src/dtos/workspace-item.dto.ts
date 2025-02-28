import {Expose, plainToInstance} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {WorkspaceEntity} from "@loopstack/core/dist/persistence/entities/workspace.entity";

export class WorkspaceItemDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @Expose()
    @ApiProperty({ type: Date })
    updatedAt: Date;

    static create(workspace: WorkspaceEntity) {
        return plainToInstance(WorkspaceItemDto, workspace, {
            excludeExtraneousValues: true,
        })
    }
}