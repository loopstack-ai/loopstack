export interface ActionInterface {
    name: string;
    service: string;
    inputs?: string[];
    output?: string;
    props?: Record<string, unknown>;
}