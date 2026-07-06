import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLoopstackClient } from './provider.js';
import { createTestClient, createWrapper } from './testing/test-utils.js';

describe('LoopstackProvider', () => {
  it('provides the client to useLoopstackClient', () => {
    const { client } = createTestClient();
    const { wrapper } = createWrapper(client);

    const { result } = renderHook(() => useLoopstackClient(), { wrapper });

    expect(result.current).toBe(client);
  });

  it('throws when used outside a provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useLoopstackClient())).toThrow(/within a <LoopstackProvider>/);
    consoleError.mockRestore();
  });
});
