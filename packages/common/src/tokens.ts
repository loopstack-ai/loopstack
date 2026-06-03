/**
 * NestJS injection tokens for framework-provided services.
 * Common defines the tokens, core provides the implementations.
 */

/** @internal Used by WorkflowOrchestrationService injection. */
export const WORKFLOW_ORCHESTRATOR = Symbol('WorkflowOrchestrator');
/** @internal Used by TemplateRenderer injection across package boundary. */
export const TEMPLATE_RENDERER = Symbol('TemplateRenderer');
/** @internal Used by BaseTool to inject ToolPipelineService across package boundary. */
export const TOOL_PIPELINE = Symbol('ToolPipeline');
/** @internal Used by BaseTool to inject ExecutionScope across package boundary. */
export const EXECUTION_SCOPE = Symbol('ExecutionScope');
/** Inject DocumentStore without depending on @loopstack/core. */
export const DOCUMENT_STORE = Symbol('DocumentStore');
/** Inject EnvironmentConfigService without depending on @loopstack/remote-client. */
export const ENVIRONMENT_CONFIG = Symbol('EnvironmentConfig');
/** @internal Metadata key for feature registrations via Module.forFeature(). */
export const FEATURE_REGISTRATION_KEY = 'loopstack:feature-registration';
/** @internal Metadata key for generic studio app extensions contributed by feature modules. */
export const STUDIO_APP_EXTENSION_KEY = 'loopstack:studio-app-extension';
/** Inject FeatureRegistryService without depending on @loopstack/core. */
export const FEATURE_REGISTRY = Symbol('FeatureRegistry');
/** Inject ToolRegistryService without depending on @loopstack/core. */
export const TOOL_REGISTRY = Symbol('ToolRegistry');
