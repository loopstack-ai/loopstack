import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GitRepository } from '../types';
import { GitRepoSelector } from './GitRepoSelector';

const REPOS: GitRepository[] = [
  { key: 'loopstack', dir: 'loopstack', primary: true },
  { key: 'platform', dir: 'platform' },
];

describe('GitRepoSelector', () => {
  // Every workspace that was never told about more than one repository looks exactly as it did before.
  it('shows nothing when there is at most one repository', () => {
    const { container: none } = render(<GitRepoSelector repos={[]} value="" onChange={vi.fn()} />);
    expect(none).toBeEmptyDOMElement();

    const { container: one } = render(<GitRepoSelector repos={[REPOS[0]]} value="loopstack" onChange={vi.fn()} />);
    expect(one).toBeEmptyDOMElement();
  });

  it('shows the chosen repository when there are several', () => {
    render(<GitRepoSelector repos={REPOS} value="platform" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox')).toHaveTextContent('platform');
  });
});
