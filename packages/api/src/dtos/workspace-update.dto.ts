import {IsString, MaxLength, ValidateIf} from "class-validator";
import {ApiPropertyOptional} from "@nestjs/swagger";

export class WorkspaceUpdateDto {
    /**
     * Human-readable title for the workspace
     * @example "My Awesome Workspace"
     */
    @ValidateIf((o) => o.title !== undefined)
    @IsString()
    @MaxLength(200, { message: 'Workspace title must not exceed 200 characters' })
    @ApiPropertyOptional({
        description: 'Human-readable title for the workspace',
        example: 'My Awesome Workspace',
    })
    title?: string;
}
