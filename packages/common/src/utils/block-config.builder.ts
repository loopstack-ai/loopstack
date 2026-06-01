import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import type { BlockConfigType, ConfigSourceInterface, UiWidgetType } from '@loopstack/contracts/types';
import type { BlockOptions, WidgetRef } from '../decorators/index.js';

export function buildConfig(options: BlockOptions, type?: string): BlockConfigType {
  let baseConfig: Partial<BlockConfigType> = {};

  // Load document-specific uiConfig (tags, meta, content) — only used by @Document
  if (typeof options.uiConfig === 'string') {
    const configSource = loadConfigFile(options.uiConfig);
    if (!configSource) {
      throw new Error(`Could not load config source ${options.uiConfig}`);
    }
    Object.assign(baseConfig, configSource.config);
  } else if (options.uiConfig) {
    baseConfig = { ...options.uiConfig };
  }

  // Title and description always come from decorator options
  if (options.title) {
    (baseConfig as Record<string, unknown>).title = options.title;
  }
  if (options.description) {
    baseConfig.description = options.description;
  }

  // Resolve widgets from the `widget` field
  if (options.widget) {
    const widgets = resolveWidgets(options.widget);
    if (widgets.length > 0) {
      (baseConfig as Record<string, unknown>).ui = { widgets };
    }
  }

  if (type) {
    baseConfig.type = type as BlockConfigType['type'];
  }

  return {
    type: baseConfig.type ?? 'undefined',
    description: baseConfig.description ?? '',
    ...baseConfig,
  } as BlockConfigType;
}

/** Resolve one or more WidgetRef entries into UiWidgetType objects. */
function resolveWidgets(ref: WidgetRef | WidgetRef[]): UiWidgetType[] {
  const refs = Array.isArray(ref) ? ref : [ref];
  const result: UiWidgetType[] = [];
  for (const r of refs) {
    if (typeof r === 'string') {
      result.push(...loadWidgetFile(r));
    } else {
      result.push(r);
    }
  }
  return result;
}

/**
 * Load widget definition(s) from a YAML file.
 * Supports two formats:
 *   - Single widget: `{ widget: '...', options: {...} }`
 *   - Multi-widget:  `{ widgets: [{ widget: '...', ... }, ...] }`
 */
function loadWidgetFile(filePath: string): UiWidgetType[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parse(raw) as Record<string, unknown>;

  if (Array.isArray(parsed.widgets)) {
    return parsed.widgets as UiWidgetType[];
  }
  return [parsed as UiWidgetType];
}

function loadConfigFile(filePath: string): ConfigSourceInterface | null {
  const raw = fs.readFileSync(filePath, 'utf8');

  const config = parse(raw) as Partial<BlockConfigType>;

  return {
    path: filePath,
    relativePath: path.basename(filePath),
    raw,
    config,
  };
}
