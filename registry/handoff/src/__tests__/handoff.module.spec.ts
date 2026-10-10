import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { FEATURE_REGISTRATION_KEY, type FeatureRegistration, getBlockOptions } from '@loopstack/common';
import {
  ChangedFilesDocument,
  ChangedFilesSchema,
  HANDOFF_DONE_TRANSITION,
  HANDOFF_TAG,
  HandoffDocument,
  HandoffModule,
  HandoffSchema,
  TerminalHandoffDocument,
  TerminalHandoffSchema,
} from '../index.js';

describe('HandoffModule.forFeature', () => {
  it('registers the `handoff` Studio feature', () => {
    const [provider] = HandoffModule.forFeature().providers ?? [];
    const registration = Reflect.getMetadata(FEATURE_REGISTRATION_KEY, provider as object) as FeatureRegistration;

    expect(registration).toEqual({ id: 'handoff', enabled: true, config: {} });
  });

  it('can be registered disabled', () => {
    const [provider] = HandoffModule.forFeature({ enabled: false }).providers ?? [];
    const registration = Reflect.getMetadata(FEATURE_REGISTRATION_KEY, provider as object) as FeatureRegistration;

    expect(registration.enabled).toBe(false);
  });
});

describe('hand-off documents', () => {
  it('HandoffDocument renders with the `handoff` widget and shows in the panel', () => {
    expect(HANDOFF_TAG).toBe('handoff');
    expect(getBlockOptions(HandoffDocument)).toMatchObject({
      name: 'handoff',
      tags: ['handoff'],
      widget: { widget: 'handoff' },
    });
  });

  it('ChangedFilesDocument renders with the `changed-files` widget and shows in the panel', () => {
    expect(getBlockOptions(ChangedFilesDocument)).toMatchObject({
      name: 'changed_files',
      tags: ['handoff'],
      widget: { widget: 'changed-files' },
    });
  });

  it('TerminalHandoffDocument drives the CLI `terminal-handoff` widget via `handoffDone`', () => {
    expect(HANDOFF_DONE_TRANSITION).toBe('handoffDone');
    expect(getBlockOptions(TerminalHandoffDocument)).toMatchObject({
      name: 'terminal_handoff',
      widget: { widget: 'terminal-handoff', options: { transition: 'handoffDone' } },
    });
  });

  it('schemas accept the documented shapes and reject unknown fields', () => {
    expect(HandoffSchema.safeParse({ title: 'Open the app', url: 'http://localhost:3000' }).success).toBe(true);
    expect(HandoffSchema.safeParse({ title: 'x', cmd: 'ls' }).success).toBe(false);

    expect(ChangedFilesSchema.safeParse({ hostRoot: '/home/me/repo', paths: ['src/a.ts'] }).success).toBe(true);
    expect(ChangedFilesSchema.safeParse({ root: '/home/me/repo', paths: [] }).success).toBe(false);

    expect(TerminalHandoffSchema.safeParse({ command: 'bash', cwd: '/workspace' }).success).toBe(true);
    expect(TerminalHandoffSchema.safeParse({ cwd: '/workspace' }).success).toBe(false);
  });
});
