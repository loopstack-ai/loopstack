import { describe, expect, it } from 'vitest';
import { STUDIO_APP_KEY, getWorkflowIdentifier } from '@loopstack/common';
import type { StudioAppMetadata } from '@loopstack/common';
import { HitlExamplesModule } from '../hitl-examples.module';

describe('HITL Studio home page', () => {
  it('starts only workflows the app registers from its start-form cards', () => {
    const metadata = Reflect.getMetadata(STUDIO_APP_KEY, HitlExamplesModule) as StudioAppMetadata;
    const registered = (metadata.workflows ?? []).map((workflow) => getWorkflowIdentifier(workflow));
    const started = (metadata.ui?.widgets ?? [])
      .filter((widget) => widget.widget === 'start-form')
      .map((widget) => widget.options?.workflow);

    expect(started).toHaveLength(3);
    for (const workflow of started) {
      expect(registered).toContain(workflow);
    }
  });
});
