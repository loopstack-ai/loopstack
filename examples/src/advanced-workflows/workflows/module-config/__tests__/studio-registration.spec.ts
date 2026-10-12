import { describe, expect, it } from 'vitest';
import { STUDIO_APP_KEY, getWorkflowIdentifier } from '@loopstack/common';
import type { StudioAppMetadata } from '@loopstack/common';
import { AdvancedWorkflowsExamplesModule } from '../../../advanced-workflows-examples.module';

describe('module-config Studio registration', () => {
  it('lists the three greeting workflows in @StudioApp so they can be started', () => {
    const metadata = Reflect.getMetadata(STUDIO_APP_KEY, AdvancedWorkflowsExamplesModule) as StudioAppMetadata;
    const names = (metadata.workflows ?? []).map((workflow) => getWorkflowIdentifier(workflow));

    expect(names).toEqual(expect.arrayContaining(['default_greeting', 'french_greeting', 'nested_greeting']));
    expect(names).not.toContain('german_greeting');
  });
});
