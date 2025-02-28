import {Expose, plainToInstance} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {DocumentEntity, NamespacesType} from "@loopstack/core";

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