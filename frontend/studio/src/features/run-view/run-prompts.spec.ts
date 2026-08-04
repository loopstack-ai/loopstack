import { describe, expect, it } from 'vitest';
import type { StudioDocumentConfig } from '@loopstack/contracts/api';
import {
  type ParkViewWidgetConfig,
  evaluateWorkflowPrompts,
  pickPrompt,
  toParkView,
} from '@loopstack/contracts/park-view';
import { promptRegistry } from './prompts/registry.tsx';
import { toWidgetConfig } from './useRunPrompts.ts';

const eligible = (candidate: { widget?: { widget: string } }) =>
  !!candidate.widget && promptRegistry.has(candidate.widget.widget);

const docConfigs = (config: ParkViewWidgetConfig) => new Map([['ask_user', config]]);

describe('run view prompt evaluation — the canonical rules over Studio data', () => {
  it('maps a StudioDocumentConfig onto the engine shape', () => {
    const config = {
      documentName: 'ask_user',
      ui: { widgets: [{ widget: 'text-prompt', options: { transition: 'userAnswered' } }] },
      schema: { type: 'object' },
      meta: { enableAtPlaces: ['later'], hideAtPlaces: ['secret'] },
      tags: ['internal'],
    } as unknown as StudioDocumentConfig;
    expect(toWidgetConfig(config)).toEqual({
      widget: 'text-prompt',
      options: { transition: 'userAnswered' },
      enabledWhen: undefined,
      showWhen: undefined,
      schema: { type: 'object' },
      enableAtPlaces: ['later'],
      hideAtPlaces: ['secret'],
      internal: true,
    });
  });

  it('a run failed at its error place surfaces the recovery prompt (ruling 1)', () => {
    const candidates = evaluateWorkflowPrompts(
      { id: 'wf', workflowName: 'probe', status: 'failed', place: 'recovery', availableTransitions: ['recover'] },
      [{ documentName: 'ask_user', place: 'recovery', content: { question: 'Retry?' } }],
      docConfigs({ widget: 'confirm-prompt', options: { transition: 'recover' } }),
    );
    const { prompt } = pickPrompt(candidates, eligible);
    expect(toParkView(prompt!)).toMatchObject({ widget: 'confirm-prompt', defaultTransition: 'recover' });
  });

  it('answer: false counts as answered (ruling 2)', () => {
    const candidates = evaluateWorkflowPrompts(
      { id: 'wf', workflowName: 'probe', status: 'waiting', place: 'ask', availableTransitions: ['userAnswered'] },
      [{ documentName: 'ask_user', place: 'ask', content: { question: 'Sure?', answer: false } }],
      docConfigs({ widget: 'confirm-prompt', options: { transition: 'userAnswered' } }),
    );
    const { prompt } = pickPrompt(candidates, eligible);
    expect(prompt).toBeUndefined();
  });

  it('an undeclared widget with a lone available transition is submittable (ruling 3)', () => {
    const candidates = evaluateWorkflowPrompts(
      { id: 'wf', workflowName: 'probe', status: 'waiting', place: 'ask', availableTransitions: ['only'] },
      [{ documentName: 'ask_user', place: 'ask', content: { question: 'Name?' } }],
      docConfigs({ widget: 'text-prompt', options: {} }),
    );
    const { prompt } = pickPrompt(candidates, eligible);
    expect(toParkView(prompt!)).toMatchObject({ widget: 'text-prompt', defaultTransition: 'only' });
  });

  it('a widget outside the run view registry is blocked, not picked', () => {
    const candidates = evaluateWorkflowPrompts(
      { id: 'wf', workflowName: 'probe', status: 'waiting', place: 'ask', availableTransitions: ['submitted'] },
      [{ documentName: 'ask_user', place: 'ask', content: { variables: ['API_KEY'] } }],
      docConfigs({ widget: 'secret-input', options: { transition: 'submitted' } }),
    );
    const { prompt, blocked } = pickPrompt(candidates, eligible);
    expect(prompt).toBeUndefined();
    expect(blocked?.widget?.widget).toBe('secret-input');
  });
});
