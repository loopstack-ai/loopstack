export interface PromptTemplateInterface {
    name: string;
    model?: string;
    systemPrompt?: string;
    prompt: string;
    output: string;
}