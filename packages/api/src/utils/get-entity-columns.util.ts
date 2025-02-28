import {getMetadataArgsStorage} from "typeorm";

export const getEntityColumns = (entity: any): string[] => {
    const metadata = getMetadataArgsStorage();
    const columns = metadata.columns.filter(column => column.target === entity);
    return columns.map(column => column.propertyName);
};