/**
 * Converts a PascalCase or camelCase string to snake_case.
 *
 * Examples:
 *   'HelloModule' → 'hello_module'
 *   'CodeAgentModule' → 'code_agent_module'
 *   'GitStatusTool' → 'git_status_tool'
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

const APP_SUFFIX_REPLACEMENTS: Record<string, string> = {
  _module: '_app',
};

/**
 * Derives a snake_case identifier from a class name.
 * Replaces known suffixes (e.g., Module → App).
 *
 * Examples:
 *   'HelloModule' → 'hello_app'
 *   'CodeAgentModule' → 'code_agent_app'
 *   'CodeAgentAppModule' → 'code_agent_app'
 */
export function deriveAppIdentifier(className: string): string {
  let identifier = toSnakeCase(className);

  for (const [suffix, replacement] of Object.entries(APP_SUFFIX_REPLACEMENTS)) {
    if (identifier.endsWith(suffix)) {
      identifier = identifier.slice(0, -suffix.length) + replacement;
      break;
    }
  }

  // Avoid double suffix: 'code_agent_app_app' → 'code_agent_app'
  if (identifier.endsWith('_app_app')) {
    identifier = identifier.slice(0, -'_app'.length);
  }

  return identifier;
}

/**
 * Derives a snake_case workflow identifier from a class name.
 * Strips the 'Workflow' suffix if present.
 *
 * Examples:
 *   'HelloWorkflow'       → 'hello'
 *   'AgentExampleWorkflow' → 'agent_example'
 *   'PromptWorkflow'       → 'prompt'
 *   'MyCustomFlow'         → 'my_custom_flow'
 */
export function deriveWorkflowIdentifier(className: string): string {
  let identifier = toSnakeCase(className);

  if (identifier.endsWith('_workflow')) {
    identifier = identifier.slice(0, -'_workflow'.length);
  }

  return identifier;
}

/**
 * Derives a snake_case document identifier from a class name.
 * Strips the 'Document' suffix if present.
 *
 * Examples:
 *   'AskUserDocument'    → 'ask_user'
 *   'LlmMessageDocument' → 'llm_message'
 *   'PlainDocument'      → 'plain'
 *   'ErrorDocument'      → 'error'
 */
export function deriveDocumentIdentifier(className: string): string {
  let identifier = toSnakeCase(className);

  if (identifier.endsWith('_document')) {
    identifier = identifier.slice(0, -'_document'.length);
  }

  return identifier;
}
