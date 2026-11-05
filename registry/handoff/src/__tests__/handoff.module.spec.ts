import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { FEATURE_REGISTRATION_KEY, type FeatureRegistration, getBlockOptions } from '@loopstack/common';
import {
  ChangedFilesDocument,
  ChangedFilesSchema,
  HANDOFF_DONE_TRANSITION,
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
  it('HandoffDocument renders with the `handoff` widget', () => {
    expect(getBlockOptions(HandoffDocument)).toMatchObject({ name: 'handoff', widget: { widget: 'handoff' } });
  });

  it('ChangedFilesDocument renders with the `changed-files` widget', () => {
    expect(getBlockOptions(ChangedFilesDocument)).toMatchObject({
      name: 'changed_files',
      widget: { widget: 'changed-files' },
    });
  });

  it('TerminalHandoffDocument drives the `terminal-handoff` widget via `handoffDone`', () => {
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

    expect(TerminalHandoffSchema.safeParse({ command: 'bash', cwd: '/workspace', title: 'Shell' }).success).toBe(true);
    expect(TerminalHandoffSchema.safeParse({ cwd: '/workspace' }).success).toBe(false);
  });

  it('a changed-files action is a command or a URL, never both or neither', () => {
    const withActions = (actions: unknown[]) =>
      ChangedFilesSchema.safeParse({ hostRoot: '/home/me/repo', paths: ['src/a.ts'], actions }).success;

    expect(
      withActions([
        { label: "Copy 'zed' command", command: 'zed "{path}"' },
        { label: 'Open in VS Code', url: 'vscode://file{path}' },
      ]),
    ).toBe(true);
    expect(withActions([{ label: 'Open', command: 'zed "{path}"', url: 'vscode://file{path}' }])).toBe(false);
    expect(withActions([{ label: 'Open' }])).toBe(false);
  });
});
