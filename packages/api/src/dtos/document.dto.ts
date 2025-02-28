import {Exclude, Expose, plainToInstance} from "class-transformer";
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {DocumentEntity} from "@loopstack/core";
import {NamespacesDto} from "./namespaces.dto";
import {DocumentMetaDto} from "./document-meta.dto";
import {DocumentContentsDto} from "./document-contents.dto";

export class DocumentDto<T = any> {
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
    @ApiPropertyOptional({ type: DocumentContentsDto })
    contents: DocumentContentsDto<T>;

    @Expose()
    @ApiProperty()
    isJsonSerialized: boolean;

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
    @ApiProperty()
    workflowIndex: number;

    @Expose()
    @ApiProperty()
    version: number;

    @Expose()
    @ApiProperty()
    index: number;

    @Expose()
    @ApiPropertyOptional()
    transition: string;

    @Expose()
    @ApiPropertyOptional()
    place: string;

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
        return plainToInstance(DocumentDto, document, {
            excludeExtraneousValues: true,
        }) as DocumentDto<T>;
    }
}