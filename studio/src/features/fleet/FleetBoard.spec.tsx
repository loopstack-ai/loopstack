import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowItemInterface, WorkspaceInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';
import { StudioPreferencesProvider } from '@/providers/StudioPreferencesProvider.tsx';
import FleetBoard from './FleetBoard.tsx';
import { type FleetEntry, classifyWorkspace, countStates } from './fleet-model.ts';
import type { FleetQuery } from './useFleet.ts';

const batchDelete = vi.fn();
const fleetQueries: FleetQuery[] = [];
/** How many workspaces the API reports — more than the fixture holds when a test needs a second page. */
let fleetTotal = 0;

vi.mock('@/providers/StudioProvider.tsx', () => ({
  useStudio: () => ({
    router: {
      getWorkflow: (id: string) => `/workflows/${id}`,
      getWorkspace: (id: string) => `/workspaces/${id}`,
      navigateToWorkflow: vi.fn(),
    },
  }),
}));
vi.mock('@/features/workbench/components/NewRunDialog.tsx', () => ({ NewRunDialog: () => null }));
vi.mock('@/features/workspaces/useAppTypes.ts', () => ({
  useAppTypes: () => ({ types: [{ appName: 'demo' }, { appName: 'other' }], isPending: false }),
}));
vi.mock('@/hooks/useWorkspaces.ts', () => ({ useBatchDeleteWorkspaces: () => ({ mutate: batchDelete }) }));
vi.mock('./NewWorkspaceTile.tsx', () => ({ default: () => null }));
vi.mock('./WorkspaceActionsMenu.tsx', () => ({ default: () => null }));
// The board asks the API for what it shows, so the mock records each question and answers with the fixture.
vi.mock('./useFleet.ts', () => ({
  useFleet: (query: FleetQuery) => {
    fleetQueries.push(query);
    return { entries, counts: countStates(entries), total: fleetTotal, isLoading: false, error: null };
  },
}));

const STORAGE_KEY = 'loopstack:studio-preferences';

function workspace(id: string, title: string): WorkspaceInterface {
  return {
    id,
    title,
    appName: 'demo',
    isFavourite: false,
    labels: [],
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

const entries: FleetEntry[] = [
  classifyWorkspace(workspace('h', 'Hotel'), []),
  classifyWorkspace(workspace('a', 'Alpha'), [working('wf-a', 'a')]),
  classifyWorkspace(workspace('c', 'Charlie'), [working('wf-c', 'c')]),
];

function savedPreferences(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
}

function renderBoard(url = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <StudioPreferencesProvider>
        <FleetBoard />
      </StudioPreferencesProvider>
    </MemoryRouter>,
  );
}

const lastQuery = () => fleetQueries[fleetQueries.length - 1];

beforeAll(() => {
  // cmdk scrolls the active option into view, which jsdom does not implement.
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ fleetDensity: 'list' }));
  fleetQueries.length = 0;
  fleetTotal = entries.length;
  batchDelete.mockClear();
});

describe('FleetBoard batch delete', () => {
  it('deletes exactly the selected workspaces, after asking', () => {
    renderBoard();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Charlie' }));
    fireEvent.click(screen.getByRole('button', { name: /Delete Selected \(2\)/ }));

    expect(batchDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(batchDelete).toHaveBeenCalledWith(['a', 'c']);
  });

  it('selects every shown workspace at once', () => {
    renderBoard();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all workspaces' }));
    expect(screen.getByRole('button', { name: /Delete Selected \(3\)/ })).toBeInTheDocument();
  });

  it('offers no selection in the card view', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fleetDensity: 'grid' }));
    renderBoard();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('FleetBoard search and filters', () => {
  it('asks the API for every workspace by default', () => {
    renderBoard();
    expect(lastQuery()).toEqual({
      search: undefined,
      appName: [],
      favouritesOnly: false,
      activity: [],
      page: { sort: { field: 'title', order: 'ASC' }, index: 0, size: 25 },
    });
  });

  it('asks the API for the chosen states, and remembers them', async () => {
    renderBoard();
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.click(screen.getByRole('button', { name: /All state/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Waiting for you' }));

    expect(lastQuery().activity).toEqual(['waiting']);
    expect(savedPreferences().fleetFilters).toEqual({ state: ['waiting'] });
  });

  it('passes the search to the API', async () => {
    renderBoard();
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'alp' } });
    await waitFor(() => expect(lastQuery().search).toBe('alp'));
  });

  it('takes an app filter from the link', () => {
    renderBoard('/dashboard?appName=demo');
    expect(screen.getByText('appName: demo')).toBeInTheDocument();
    expect(lastQuery().appName).toEqual(['demo']);
  });

  it('adds an app to the filter when it is clicked', () => {
    renderBoard();
    fireEvent.click(screen.getAllByRole('button', { name: 'demo' })[0]);
    expect(lastQuery().appName).toEqual(['demo']);
  });

  it('takes the favourites filter from the link', () => {
    renderBoard('/dashboard?favourites=true');
    expect(lastQuery().favouritesOnly).toBe(true);
  });
});

describe('FleetBoard list view', () => {
  it('shows the workspaces as a table with column headers', () => {
    renderBoard();
    for (const name of ['State', 'Title', 'App', 'Run', 'Active runs', 'Started', 'Created', 'Favourite']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('row')).toHaveLength(1 + entries.length + 1);
  });

  it('asks the API for the order of a column when its header is clicked, and remembers it', () => {
    renderBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Created' }));
    expect(lastQuery().page?.sort).toEqual({ field: 'createdAt', order: 'ASC' });

    fireEvent.click(screen.getByRole('button', { name: 'Created' }));
    expect(lastQuery().page?.sort).toEqual({ field: 'createdAt', order: 'DESC' });
    expect(screen.getByRole('columnheader', { name: 'Created' })).toHaveAttribute('aria-sort', 'descending');
    expect(savedPreferences().fleetListSort).toEqual({ field: 'createdAt', order: 'DESC' });
  });

  it('sorts by none of the columns computed from runs', () => {
    renderBoard();
    for (const name of ['State', 'Run', 'Active runs', 'Started']) {
      expect(within(screen.getByRole('columnheader', { name })).queryByRole('button')).not.toBeInTheDocument();
    }
  });

  it('asks the API for the next page, and for the first again when the sort changes', () => {
    fleetTotal = 60;
    renderBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(lastQuery().page?.index).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'App' }));
    expect(lastQuery().page).toEqual({ sort: { field: 'appName', order: 'ASC' }, index: 0, size: 25 });
  });

  it('says its state counts cover only the page when there are more', () => {
    fleetTotal = 60;
    renderBoard();
    expect(screen.getByText('2 working · 1 idle on this page')).toBeInTheDocument();
  });

  it('offers no drag', () => {
    renderBoard();
    expect(screen.queryByLabelText('Reorder Charlie')).not.toBeInTheDocument();
  });
});

describe('FleetBoard card view', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fleetDensity: 'grid' }));
  });

  it('asks the API for the cards without a page, so their dragged order applies', () => {
    renderBoard();
    expect(lastQuery().page).toBeUndefined();
  });

  it('keeps a workspace the filters hide in its saved place when a card is dragged', () => {
    // x is ranked but not loaded — filtered out by the API, so the board never sees it.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fleetDensity: 'grid', fleetOrder: ['x', 'h', 'a', 'c'] }));
    renderBoard();

    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    const target = screen.getByText('Alpha').closest('[data-slot="card"]')!;
    fireEvent.dragStart(screen.getByLabelText('Reorder Charlie'), { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(savedPreferences().fleetOrder).toEqual(['x', 'h', 'c', 'a']);
  });
});
