import {Exclude, Expose, plainToInstance} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {WorkflowTransitionConfigInterface} from "@loopstack/shared";
import {HistoryTransition, WorkflowStateEntity} from "@loopstack/core";

export class WorkflowStateDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    place: string;

    @Expose()
    @ApiProperty({ isArray: true })
    availableTransitions: WorkflowTransitionConfigInterface[];

    @Expose()
    @ApiProperty({ isArray: true })
    transitionHistory: HistoryTransition[];

    @Expose()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @Expose()
    @ApiProperty({ type: Date })
    updatedAt: Date;

    @Exclude()
    createdBy: string | null;
}