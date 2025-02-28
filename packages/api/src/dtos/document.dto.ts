import {Exclude, Expose, plainToInstance} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {DocumentEntity, NamespacesType} from "@loopstack/core";

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
    @ApiProperty()
    contents: T | null;

    @Expose()
    @ApiProperty()
    isJsonSerialized: boolean;

    @Expose()
    @ApiProperty()
    meta: Record<string, any> | null;

    @Expose()
    @ApiProperty()
    namespaces: NamespacesType;

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
    @ApiProperty()
    transition: string | null;

    @Expose()
    @ApiProperty()
    place: string | null;

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

    @Exclude()
    createdBy: string | null;

    static create<T>(document: DocumentEntity<T>) {
        return plainToInstance(DocumentDto, document, {
            excludeExtraneousValues: true,
        }) as DocumentDto<T>;
    }
}