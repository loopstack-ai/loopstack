import {IsOptional} from "class-validator";
import {TransitionPayloadInterface} from "@loopstack/core/dist/state-machine/interfaces/transition-payload.interface";
import {ApiPropertyOptional} from "@nestjs/swagger";

/**
 * DTO for project run payload
 */
export class RunProjectPayloadDto {
    @IsOptional()
    @ApiPropertyOptional()
    transition?: TransitionPayloadInterface;
}