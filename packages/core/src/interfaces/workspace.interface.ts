import {NamedCollectionItem} from "./named-collection-item.interface";

export interface WorkspaceInterface extends NamedCollectionItem {
    name: string;
    type: "virtual";
}