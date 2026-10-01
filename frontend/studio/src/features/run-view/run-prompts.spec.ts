import { describe, expect, it } from 'vitest';
import type { StudioDocumentConfig } from '@loopstack/contracts/api';
import {
  type ParkViewWidgetConfig,
  evaluateWorkflowPrompts,
  pickPrompt,
  toParkView,
} from '@loopstack/contracts/park-view';
import { promptRegistry } from './prompts/registry.tsx';
import { controlsBeside, toWidgetConfig } from './useRunPrompts.ts';

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
      { id: 'wf', workflowName: 'probe', status: 'waiting', place: 'ask', availableTransitions: ['ran'] },
      [{ documentName: 'ask_user', place: 'ask', content: {} }],
      docConfigs({ widget: 'sandbox-run', options: { transition: 'ran' } }),
    );
    const { prompt, blocked } = pickPrompt(candidates, eligible);
    expect(prompt).toBeUndefined();
    expect(blocked?.widget?.widget).toBe('sandbox-run');
  });

  it('secret-input is picked — registered as a run-view-native prompt', () => {
    const candidates = evaluateWorkflowPrompts(
      { id: 'wf', workflowName: 'probe', status: 'waiting', place: 'ask', availableTransitions: ['submitted'] },
      [{ documentName: 'ask_user', place: 'ask', content: { variables: [{ key: 'API_KEY' }] } }],
      docConfigs({ widget: 'secret-input', options: { transition: 'submitted' } }),
    );
    const { prompt } = pickPrompt(candidates, eligible);
    expect(toParkView(prompt!)).toMatchObject({ widget: 'secret-input', defaultTransition: 'submitted' });
  });
});

describe('controls beside the picked prompt', () => {
  const run = { id: 'loop', workflowName: 'engineer_loop', status: 'waiting', place: 'awaiting_concept' };
  const card: ParkViewWidgetConfig = {
    widget: 'form',
    options: { actions: [{ transition: 'onConfirmConcept', label: 'Start' }] },
  };
  const reply: ParkViewWidgetConfig = {
    widget: 'prompt-input',
    showWhen: ['awaiting_concept'],
    options: { transition: 'onReviseConcept' },
  };
  const finish: ParkViewWidgetConfig = {
    widget: 'button',
    showWhen: ['awaiting_concept', 'awaiting_user'],
    options: { transition: 'onFinishPhase' },
  };

  it('draws every live workflow-level widget next to the card the rules picked', () => {
    // Documents come first in the rules, so without this the reply input at a gate is never seen.
    const candidates = evaluateWorkflowPrompts(
      { ...run, availableTransitions: ['onConfirmConcept', 'onReviseConcept', 'onFinishPhase'] },
      [{ documentName: 'concept', place: 'awaiting_concept', content: { markdown: 'x' } }],
      new Map([['concept', card]]),
      [reply, finish],
    );
    const picked = pickPrompt(candidates, eligible);
    expect(picked.prompt?.kind).toBe('document');
    const controls = controlsBeside(candidates, picked.prompt, eligible);
    expect(controls.map((candidate) => candidate.widget?.widget)).toEqual(['prompt-input', 'button']);
  });

  it('does not draw the picked widget a second time, nor one hidden at this place', () => {
    const candidates = evaluateWorkflowPrompts(
      { ...run, place: 'awaiting_user', availableTransitions: ['onFinishPhase'] },
      [],
      new Map(),
      [reply, finish],
    );
    const picked = pickPrompt(candidates, eligible);
    expect(picked.prompt?.widget?.widget).toBe('button');
    expect(controlsBeside(candidates, picked.prompt, eligible)).toEqual([]);
  });
});
