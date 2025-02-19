export interface UtilInterface {
    name: string;
    args?: {
        name: string;
        type: "string" | "number" | "boolean" | "object" | "array";
    }[];
    execute: {
        function: string;
        props?: Record<string, unknown>;
    }[];
}