import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowItemInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import { StudioPreferencesProvider } from '@/providers/StudioPreferencesProvider.tsx';
import FleetBoard from './FleetBoard.tsx';
import { type FleetEntry, classifyWorkspace, countStates } from './fleet-model.ts';

vi.mock('@/providers/StudioProvider.tsx', () => ({
  useStudio: () => ({ router: { getWorkflow: (id: string) => `/workflows/${id}`, navigateToWorkflow: vi.fn() } }),
}));
vi.mock('@/features/workbench/components/NewRunDialog.tsx', () => ({ NewRunDialog: () => null }));
vi.mock('./NewWorkspaceTile.tsx', () => ({ default: () => null }));
vi.mock('./useFleet.ts', () => ({
  useFleet: () => ({ entries, counts: countStates(entries), total: entries.length, isLoading: false, error: null }),
}));

const STORAGE_KEY = 'loopstack:studio-preferences';
const TOGGLE = 'Show active workflows only';

function workspace(id: string, title: string): WorkspaceInterface {
  return {
    id,
    title,
    appName: 'demo',
    isFavourite: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  };
}

function working(id: string, workspaceId: string): WorkflowItemInterface {
  return {
    id,
    workflowName: 'Workflow',
    title: null,
    run: 1,
    labels: [],
    hasError: false,
    place: 'step',
    status: WorkflowState.Running,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    workspaceId,
    parentId: null,
    hasChildren: 0,
    activeChildren: 0,
    availableTransitions: null,
  };
}

// The idle workspace leads the board, so a drop that saved only the visible cards would push it to the tail.
const entries: FleetEntry[] = [
  classifyWorkspace(workspace('h', 'Hotel'), []),
  classifyWorkspace(workspace('a', 'Alpha'), [working('wf-a', 'a')]),
  classifyWorkspace(workspace('c', 'Charlie'), [working('wf-c', 'c')]),
];

function savedPreferences(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
}

function renderBoard() {
  return render(
    <MemoryRouter>
      <StudioPreferencesProvider>
        <FleetBoard />
      </StudioPreferencesProvider>
    </MemoryRouter>,
  );
}

describe('FleetBoard active-only filter', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fleetDensity: 'list' }));
  });

  it('shows every workspace by default', () => {
    renderBoard();
    expect(screen.getByRole('button', { name: TOGGLE })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Hotel')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('hides idle workspaces, keeps the summary over all of them, and remembers the choice', () => {
    renderBoard();
    fireEvent.click(screen.getByRole('button', { name: TOGGLE }));

    expect(screen.queryByText('Hotel')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText(/2 working · 1 idle/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: TOGGLE })).toHaveAttribute('aria-pressed', 'true');
    expect(savedPreferences().fleetActiveOnly).toBe(true);
  });

  it('keeps a hidden workspace in its saved place when a card is dragged', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fleetDensity: 'list', fleetActiveOnly: true }));
    renderBoard();

    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    const target = screen.getByText('Alpha').closest('li')!;
    fireEvent.dragStart(screen.getByLabelText('Reorder Charlie'), { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(savedPreferences().fleetOrder).toEqual(['h', 'c', 'a']);
  });
});
