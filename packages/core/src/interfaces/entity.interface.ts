export interface EntityInterface {
    name: string;
    schema?: Record<string, unknown>;
    validator?: string;
    entity?: string;
}