import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StudioDocumentConfig, WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { createStudioTestClient, createStudioWrapper } from '@/test-utils/loopstack.tsx';
import { TerminalHandoffCard } from './TerminalHandoffCard';

const TRANSITION = 'handoffDone';
const COMMAND = 'docker exec -it -w /workspace abc123 claude --continue';

const documentConfig = {
  documentName: 'terminal_handoff',
  ui: { widgets: [{ widget: 'terminal-handoff', options: { transition: TRANSITION } }] },
} as unknown as StudioDocumentConfig;

const document = {
  id: 'doc-1',
  documentName: 'terminal_handoff',
  index: 1,
  content: { command: COMMAND, cwd: '/workspace' },
  createdAt: '2026-10-01T08:00:00.000Z',
} as unknown as DocumentItemInterface;

const parentWorkflow = { id: 'wf-parent' } as WorkflowFullInterface;

function workflow(availableTransitions: string[]): WorkflowFullInterface {
  return {
    id: 'wf-attach',
    availableTransitions: availableTransitions.map((id) => ({ id })),
  } as unknown as WorkflowFullInterface;
}

function renderCard(availableTransitions = [TRANSITION], isActive = true) {
  const { client, processor } = createStudioTestClient([documentConfig]);
  const { wrapper: Wrapper } = createStudioWrapper(client);
  const view = render(
    <TerminalHandoffCard
      parentWorkflow={parentWorkflow}
      workflow={workflow(availableTransitions)}
      document={document}
      isActive={isActive}
      isLastItem={true}
    />,
    { wrapper: Wrapper },
  );
  return { ...view, processor };
}

const endButton = () => screen.getByRole('button', { name: /end session/i });

describe('TerminalHandoffCard', () => {
  it('shows the command and offers to end the session while the transition is available', async () => {
    renderCard();

    expect(screen.getByText(COMMAND)).toBeInTheDocument();
    await waitFor(() => expect(endButton()).toBeEnabled());
  });

  it('fires the handoff transition with an empty payload when the session is ended by hand', async () => {
    const { container, processor } = renderCard();

    await waitFor(() => expect(endButton()).toBeEnabled());
    fireEvent.click(endButton());

    await waitFor(() =>
      expect(processor.run).toHaveBeenCalledWith('wf-parent', {
        transition: { id: TRANSITION, workflowId: 'wf-attach', payload: {} },
      }),
    );
    // Queued is not applied: the button stays busy until the run leaves the waiting place.
    expect(endButton()).toBeDisabled();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('reads as ended once the run no longer offers the transition', () => {
    renderCard([]);

    expect(screen.getByText(COMMAND)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /end session/i })).not.toBeInTheDocument();
    expect(screen.getByText(/session ended/i)).toBeInTheDocument();
  });
});
