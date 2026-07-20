import { BadRequestException, Injectable } from '@nestjs/common';
import type { StudioDocumentConfig } from '@loopstack/contracts/api';
import { StudioDiscoveryService } from '@loopstack/core';
import { DocumentApiService } from './document-api.service.js';

interface WidgetConfigLike {
  widget?: string;
  options?: {
    transition?: unknown;
    actions?: { transition?: unknown }[];
    properties?: Record<string, { readonly?: unknown } | undefined>;
  };
}

interface WorkflowLike {
  id: string;
  place?: string | null;
}

/**
 * Enforces per-field `readonly` form configuration at the user-input
 * boundary: a transition submission may not change fields the declaring
 * widget marks read-only. The rule mirrors Studio's field resolution
 * (`ui.properties[key].readonly ?? schema.properties[key].readonly`) and
 * Studio's activeness/submit gates — only documents at the workflow's
 * current place (or enabled there via `meta.enableAtPlaces`) whose widget
 * declares the submitted transition are checked. Internal transitions
 * (sub-workflow callbacks, OAuth completion) don't pass through this
 * service, so workflows stay free to update their own documents.
 */
@Injectable()
export class ReadOnlyValidationService {
  constructor(
    private readonly studioDiscoveryService: StudioDiscoveryService,
    private readonly documentApiService: DocumentApiService,
  ) {}

  async assertPayloadRespectsReadOnly(
    userId: string,
    workflow: WorkflowLike,
    transitionId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const place = workflow.place ?? '';
    const candidates = this.candidateConfigs(transitionId);
    if (candidates.size === 0) return;

    const activeDocuments = await this.fetchActiveDocuments(userId, workflow.id, place, candidates);

    for (const document of activeDocuments) {
      const candidate = candidates.get(document.documentName);
      if (!candidate) continue;
      const content = (document.content ?? {}) as Record<string, unknown>;
      for (const key of candidate.readOnlyKeys) {
        if (!(key in payload)) continue;
        if (!deepEqual(payload[key], content[key])) {
          throw new BadRequestException(`Field "${key}" of document "${document.documentName}" is read-only.`);
        }
      }
    }
  }

  /**
   * Document configs whose first widget declares the submitted transition
   * (Studio's `canSubmit` link) and marks at least one field read-only.
   */
  private candidateConfigs(transitionId: string): Map<string, { readOnlyKeys: string[]; enableAtPlaces: string[] }> {
    const candidates = new Map<string, { readOnlyKeys: string[]; enableAtPlaces: string[] }>();
    for (const app of this.studioDiscoveryService.getApps()) {
      for (const config of app.documents ?? []) {
        if (candidates.has(config.documentName)) continue;
        const widget = (config.ui as { widgets?: WidgetConfigLike[] } | undefined)?.widgets?.[0];
        if (!widget || !declaredTransitions(widget).includes(transitionId)) continue;
        const readOnlyKeys = readOnlyFields(widget, config);
        if (readOnlyKeys.length === 0) continue;
        const enableAtPlaces = (config.meta as { enableAtPlaces?: string[] } | undefined)?.enableAtPlaces ?? [];
        candidates.set(config.documentName, { readOnlyKeys, enableAtPlaces });
      }
    }
    return candidates;
  }

  /** Studio's `isDocumentActive`: saved at the current place, or enabled there. */
  private async fetchActiveDocuments(
    userId: string,
    workflowId: string,
    place: string,
    candidates: Map<string, { enableAtPlaces: string[] }>,
  ): Promise<{ documentName: string; content: unknown }[]> {
    const atPlace = await this.documentApiService.findAll(
      userId,
      { workflowId, place, isInvalidated: false },
      undefined,
      { page: undefined, limit: undefined },
    );
    const active = [...atPlace.data];

    const enabledHere = [...candidates.entries()]
      .filter(([, candidate]) => candidate.enableAtPlaces.includes(place))
      .map(([name]) => name);
    if (enabledHere.length > 0) {
      const all = await this.documentApiService.findAll(userId, { workflowId, isInvalidated: false }, undefined, {
        page: undefined,
        limit: undefined,
      });
      for (const document of all.data) {
        if (enabledHere.includes(document.documentName) && document.place !== place) {
          active.push(document);
        }
      }
    }
    return active;
  }
}

function declaredTransitions(widget: WidgetConfigLike): string[] {
  const transitions: string[] = [];
  if (typeof widget.options?.transition === 'string') transitions.push(widget.options.transition);
  for (const action of widget.options?.actions ?? []) {
    if (typeof action.transition === 'string') transitions.push(action.transition);
  }
  return transitions;
}

/**
 * Fields marked read-only — widget config wins over schema, per field,
 * exactly like Studio's `useFieldConfig` (`ui.readonly ?? schema.readonly`).
 */
function readOnlyFields(widget: WidgetConfigLike, config: StudioDocumentConfig): string[] {
  const schemaProperties =
    ((config.schema as { properties?: Record<string, { readonly?: unknown } | undefined> } | undefined)
      ?.properties as Record<string, { readonly?: unknown } | undefined>) ?? {};
  const uiProperties = widget.options?.properties ?? {};

  const keys = new Set([...Object.keys(uiProperties), ...Object.keys(schemaProperties)]);
  return [...keys].filter((key) => (uiProperties[key]?.readonly ?? schemaProperties[key]?.readonly) === true);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (typeof a === 'object') {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord);
    if (aKeys.length !== Object.keys(bRecord).length) return false;
    return aKeys.every((key) => deepEqual(aRecord[key], bRecord[key]));
  }
  return false;
}
