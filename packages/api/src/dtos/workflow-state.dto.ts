import {Expose} from "class-transformer";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {WorkflowStateHistoryDto, WorkflowStatePlaceInfoDto} from "@loopstack/core";

export class WorkflowStateDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    place: string;

    @Expose()
    @ApiPropertyOptional({ type: WorkflowStatePlaceInfoDto })
    placeInfo: WorkflowStatePlaceInfoDto | null;

    @Expose()
    @ApiPropertyOptional({ type: WorkflowStateHistoryDto })
    transitionHistory: WorkflowStateHistoryDto | null;

    @Expose()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @Expose()
    @ApiProperty({ type: Date })
    updatedAt: Date;
}