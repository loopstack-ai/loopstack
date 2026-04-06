/**
 * NestJS injection tokens for framework-provided services.
 * Common defines the tokens, core provides the implementations.
 */
export const DOCUMENT_REPOSITORY = Symbol('DocumentRepository');
export const FRAMEWORK_CONTEXT = Symbol('FrameworkContext');
export const WORKFLOW_ORCHESTRATOR = Symbol('WorkflowOrchestrator');
