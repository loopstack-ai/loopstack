import { describe, expect, it } from 'vitest';
import {
  declaredTransitions,
  evaluateWorkflowPrompts,
  isAnswerableState,
  isAnswered,
  isDocumentActive,
  isDocumentVisible,
  pickPrompt,
  resolveSubmitTransition,
  toParkView,
  widgetState,
} from './park-view.rules.js';
import type { ParkViewDocumentInput, ParkViewWidgetConfig, ParkViewWorkflowInput } from './park-view.types.js';

const wf = (over: Partial<ParkViewWorkflowInput> = {}): ParkViewWorkflowInput => ({
  id: 'wf-1',
  workflowName: 'probe',
  status: 'waiting',
  place: 'ask',
  availableTransitions: ['userAnswered'],
  ...over,
});

const doc = (over: Partial<ParkViewDocumentInput> = {}): ParkViewDocumentInput => ({
  documentName: 'ask_user',
  place: 'ask',
  content: { question: 'Proceed?' },
  ...over,
});

const widget = (over: Partial<ParkViewWidgetConfig> = {}): ParkViewWidgetConfig => ({
  widget: 'confirm-prompt',
  options: { transition: 'userAnswered' },
  ...over,
});

const configs = (config: ParkViewWidgetConfig = widget()) => new Map([['ask_user', config]]);

describe('ruling 1 — answerable states are waiting, paused, and failed with transitions', () => {
  it.each(['waiting', 'paused', 'failed'])('%s with transitions is answerable', (status) => {
    expect(isAnswerableState(status, ['recover'])).toBe(true);
  });

  it.each(['running', 'completed', 'canceled', 'pending'])('%s is not answerable', (status) => {
    expect(isAnswerableState(status, ['t'])).toBe(false);
  });

  it('no available transitions means not answerable regardless of state', () => {
    expect(isAnswerableState('waiting', [])).toBe(false);
  });

  it('a failed workflow at an error place surfaces its recovery prompt', () => {
    const candidates = evaluateWorkflowPrompts(
      wf({ status: 'failed', place: 'recovery', availableTransitions: ['recover'] }),
      [doc({ documentName: 'ask_user', place: 'recovery' })],
      configs(widget({ options: { transition: 'recover' } })),
    );
    expect(candidates[0]).toMatchObject({ kind: 'document', state: 'active', submitTransition: 'recover' });
  });
});

describe('ruling 2 — answered means the answer field is present, not truthy', () => {
  it('answer: false is an answer', () => {
    expect(isAnswered({ answer: false })).toBe(true);
  });

  it('empty-string answers are answers', () => {
    expect(isAnswered({ answer: '' })).toBe(true);
  });

  it('missing answer is unanswered', () => {
    expect(isAnswered({ question: 'x' })).toBe(false);
    expect(isAnswered(null)).toBe(false);
  });

  it('an answered document produces no candidate', () => {
    const candidates = evaluateWorkflowPrompts(wf(), [doc({ content: { answer: false } })], configs());
    expect(candidates.filter((c) => c.kind === 'document')).toEqual([]);
  });
});

describe('ruling 3 — no declared transition resolves only a lone available transition', () => {
  const undeclared = widget({ options: {} });

  it('lone available transition resolves', () => {
    expect(resolveSubmitTransition(undeclared, ['only'])).toBe('only');
  });

  it('multiple available without declaration resolve nothing', () => {
    expect(resolveSubmitTransition(undeclared, ['a', 'b'])).toBeUndefined();
    expect(widgetState(undeclared, 'ask', ['a', 'b'])).toBe('disabled');
  });

  it('declared transition wins over the lone rule and must be available', () => {
    expect(resolveSubmitTransition(widget(), ['userAnswered', 'other'])).toBe('userAnswered');
    expect(resolveSubmitTransition(widget(), ['other'])).toBeUndefined();
  });

  it('declared transitions include form actions', () => {
    const form = widget({ widget: 'form', options: { actions: [{ label: 'Ok', transition: 'ok' }] } });
    expect(declaredTransitions(form)).toEqual(['ok']);
    expect(resolveSubmitTransition(form, ['ok'])).toBe('ok');
  });
});

describe('ruling 4 — hideAtPlaces and internal filtering are canonical', () => {
  it('hideAtPlaces hides at the declared place only', () => {
    const config = widget({ hideAtPlaces: ['ask'] });
    expect(isDocumentVisible(doc(), config, 'ask')).toBe(false);
    expect(isDocumentVisible(doc(), config, 'other')).toBe(true);
  });

  it('internal config or tag hides everywhere', () => {
    expect(isDocumentVisible(doc(), widget({ internal: true }), 'ask')).toBe(false);
    expect(isDocumentVisible(doc({ tags: ['internal'] }), widget(), 'ask')).toBe(false);
  });

  it('a hidden document produces no candidate', () => {
    const candidates = evaluateWorkflowPrompts(wf(), [doc()], configs(widget({ hideAtPlaces: ['ask'] })));
    expect(candidates.filter((c) => c.kind === 'document')).toEqual([]);
  });
});

describe('ruling 5 — showWhen hides, enabledWhen disables', () => {
  it('showWhen outside its places hides the widget', () => {
    expect(widgetState(widget({ showWhen: ['other'] }), 'ask', ['userAnswered'])).toBe('hidden');
  });

  it('enabledWhen outside its places disables but shows', () => {
    expect(widgetState(widget({ enabledWhen: ['other'] }), 'ask', ['userAnswered'])).toBe('disabled');
  });

  it('inside the declared places the widget is active', () => {
    expect(widgetState(widget({ showWhen: ['ask'] }), 'ask', ['userAnswered'])).toBe('active');
    expect(widgetState(widget({ enabledWhen: ['ask'] }), 'ask', ['userAnswered'])).toBe('active');
  });

  it('a false statusGate disables an otherwise active widget', () => {
    expect(widgetState(widget(), 'ask', ['userAnswered'], false)).toBe('disabled');
  });
});

describe('document activity by place', () => {
  it('active when saved at the current place or enabled there', () => {
    expect(isDocumentActive(doc(), widget(), 'ask')).toBe(true);
    expect(isDocumentActive(doc({ place: 'earlier' }), widget(), 'ask')).toBe(false);
    expect(isDocumentActive(doc({ place: 'earlier' }), widget({ enableAtPlaces: ['ask'] }), 'ask')).toBe(true);
  });
});

describe('selection semantics', () => {
  it('first active document prompt wins over workflow widgets and fallback', () => {
    const candidates = evaluateWorkflowPrompts(wf(), [doc()], configs(), [
      widget({ widget: 'prompt-input', options: {} }),
    ]);
    const { prompt, fallback } = pickPrompt(candidates);
    expect(prompt).toMatchObject({ kind: 'document' });
    // selection returns early on a hit — the fallback is only reported when nothing renderable won
    expect(fallback).toBeUndefined();
  });

  it('an ineligible active candidate is reported as blocked, the next eligible wins', () => {
    const candidates = evaluateWorkflowPrompts(wf(), [doc()], configs(), [widget({ widget: 'prompt-input' })]);
    const { prompt, blocked } = pickPrompt(candidates, (c) => c.widget?.widget !== 'confirm-prompt');
    expect(blocked).toMatchObject({ kind: 'document' });
    expect(prompt).toMatchObject({ kind: 'workflow' });
  });

  it("a rejected widget without declared transitions is not blocked — display-only, not another surface's prompt", () => {
    const undeclared = widget({ widget: 'markdown', options: {} });
    const candidates = evaluateWorkflowPrompts(wf(), [doc()], configs(undeclared));
    const { prompt, blocked, fallback } = pickPrompt(candidates, () => false);
    expect(prompt).toBeUndefined();
    expect(blocked).toBeUndefined();
    expect(fallback).toMatchObject({ kind: 'bare' });
  });

  it('a display-only widget is never a prompt candidate, even with a lone available transition', () => {
    // A message document at a park with one available transition must NOT be surfaced as a
    // prompt via the lone-transition leniency — it is transcript content (DISPLAY_WIDGETS).
    const message = widget({ widget: 'llm-message', options: {} });
    const candidates = evaluateWorkflowPrompts(wf(), [doc({ content: { text: 'Hi!' } })], configs(message));
    expect(candidates.filter((c) => c.kind === 'document')).toEqual([]);
    // With no eligibility predicate (the facade's default) it resolves to the bare wait,
    // not the message.
    const { prompt, fallback } = pickPrompt(candidates);
    expect(prompt).toBeUndefined();
    expect(fallback).toMatchObject({ kind: 'bare' });
  });

  it('nothing renderable falls back to the bare wait', () => {
    const { prompt, fallback } = pickPrompt(evaluateWorkflowPrompts(wf(), [], configs()));
    expect(prompt).toBeUndefined();
    expect(fallback).toMatchObject({ kind: 'bare', workflow: { id: 'wf-1' } });
  });

  it('non-answerable workflows produce nothing at all', () => {
    expect(evaluateWorkflowPrompts(wf({ status: 'running' }), [doc()], configs())).toEqual([]);
  });
});

describe('toParkView', () => {
  it('assembles the prompt view with default transition and submittable action labels', () => {
    const form = widget({
      widget: 'form',
      schema: { type: 'object' },
      options: {
        actions: [
          { label: 'Approve', transition: 'approved' },
          { label: 'Reject', transition: 'rejected' },
          { label: 'Later', transition: 'unavailable' },
        ],
      },
    });
    const [candidate] = evaluateWorkflowPrompts(
      wf({ availableTransitions: ['approved', 'rejected'] }),
      [doc({ documentName: 'ask_user', content: { markdown: 'Approve the expense?' } })],
      configs(form),
    );

    const view = toParkView(candidate);
    expect(view).toMatchObject({
      workflowId: 'wf-1',
      widget: 'form',
      documentName: 'ask_user',
      content: { markdown: 'Approve the expense?' },
      schema: { type: 'object' },
      transitions: ['approved', 'rejected'],
      defaultTransition: 'approved',
      actions: ['Approve', 'Reject'],
    });
  });

  it('renders a bare wait as workflow-only data with the lone transition as default', () => {
    const { fallback } = pickPrompt(evaluateWorkflowPrompts(wf(), [], configs()));
    const view = toParkView(fallback!);
    expect(view).toMatchObject({
      workflowId: 'wf-1',
      transitions: ['userAnswered'],
      defaultTransition: 'userAnswered',
    });
    expect(view.widget).toBeUndefined();
    expect(view.documentName).toBeUndefined();
  });
});
