import {Expose, plainToInstance} from "class-transformer";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {DocumentEntity, NamespacesType} from "@loopstack/core";
import {DocumentMetaDto} from "./document-meta.dto";
import {NamespacesDto} from "./namespaces.dto";

export class DocumentItemDto<T = any> {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty()
    type: string;

    @Expose()
    @ApiPropertyOptional({ type: DocumentMetaDto })
    meta: DocumentMetaDto;

    @Expose()
    @ApiProperty({ type: NamespacesDto })
    namespaces: NamespacesDto;

    @Expose()
    @ApiProperty()
    isInvalidated: boolean;

    @Expose()
    @ApiProperty()
    isPendingRemoval: boolean;

    @Expose()
    @ApiProperty({ type: Date })
    createdAt: Date;

    @Expose()
    @ApiProperty({ type: Date })
    updatedAt: Date;

    @Expose()
    @ApiProperty()
    workspaceId: string;

    @Expose()
    @ApiProperty()
    projectId: string;

    @Expose()
    @ApiProperty()
    workflowId: string;

    static create<T>(document: DocumentEntity<T>) {
        return plainToInstance(DocumentItemDto, document, {
            excludeExtraneousValues: true,
        }) as DocumentItemDto<T>;
    }
}