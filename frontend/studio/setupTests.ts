import '@testing-library/jest-dom';
import { cleanup, configure } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

// Testing Library allows an async assertion one second by default, which is a wall-clock budget rather
// than a number of attempts — so on a loaded CI runner it can elapse while React has yet to flush, and a
// test that is only waiting for a mocked query to resolve fails for want of a scheduler slot. The ceiling
// costs nothing when things are quick: `waitFor` returns the moment its condition holds.
configure({ asyncUtilTimeout: 5000 });

beforeEach(() => {
  cleanup();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
