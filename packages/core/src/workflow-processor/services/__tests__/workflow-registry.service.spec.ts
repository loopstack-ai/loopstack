import { beforeEach, describe, expect, it } from 'vitest';
import { BLOCK_TYPE_METADATA_KEY, Workflow } from '@loopstack/common';
import { WorkflowRegistryService } from '../workflow-registry.service.js';

@Workflow({ title: 'Demo' })
class DemoWorkflow {}

@Workflow({ name: 'renamed', title: 'Named' })
class NamedWorkflow {}

/** Mimics what DiscoveryService hands the registry at bootstrap. */
function discoveryOf(...classes: unknown[]) {
  return {
    getProviders: () =>
      classes.map((metatype) => ({
        metatype,
        instance: Object.create((metatype as { prototype: object }).prototype),
      })),
  };
}

describe('WorkflowRegistryService', () => {
  let registry: WorkflowRegistryService;

  beforeEach(() => {
    // Guard the assumption the registry relies on: @Workflow marks the class as a workflow block.
    expect(Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, DemoWorkflow)).toBe('workflow');

    registry = new WorkflowRegistryService(discoveryOf(DemoWorkflow, NamedWorkflow) as never);
    registry.onApplicationBootstrap();
  });

  it('knows a workflow by its derived identifier', () => {
    expect(registry.hasName('demo')).toBe(true);
  });

  it('knows a workflow by an explicit name', () => {
    expect(registry.hasName('renamed')).toBe(true);
    expect(registry.hasName('named')).toBe(false);
  });

  it('does not know a workflow another deployment registered', () => {
    expect(registry.hasName('foreign')).toBe(false);
  });

  it('lists every registered identifier', () => {
    expect(registry.names().sort()).toEqual(['demo', 'renamed']);
  });
});
