import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { StudioDocumentConfig, WorkflowFullInterface } from '@loopstack/contracts/api';
import type { DocumentItemInterface } from '@loopstack/contracts/types';
import { createStudioTestClient, createStudioWrapper } from '@/test-utils/loopstack.tsx';
import ConfirmPromptRenderer from './ConfirmPromptRenderer.tsx';

const TRANSITION = 'userAnswered';

const documentConfig = {
  documentName: 'confirm_prompt',
  ui: { widgets: [{ widget: 'confirm', options: { transition: TRANSITION } }] },
} as unknown as StudioDocumentConfig;

const document = {
  id: 'doc-1',
  documentName: 'confirm_prompt',
  index: 1,
  content: { question: 'Ship it?' },
  createdAt: '2026-09-18T08:00:00.000Z',
} as unknown as DocumentItemInterface;

const parentWorkflow = { id: 'wf-parent' } as WorkflowFullInterface;

function workflow(availableTransitions: string[]): WorkflowFullInterface {
  return {
    id: 'wf-child',
    availableTransitions: availableTransitions.map((id) => ({ id })),
  } as unknown as WorkflowFullInterface;
}

function renderConfirm(availableTransitions = [TRANSITION]) {
  const { client, processor } = createStudioTestClient([documentConfig]);
  const { wrapper: Wrapper } = createStudioWrapper(client);
  const view = render(
    <ConfirmPromptRenderer
      parentWorkflow={parentWorkflow}
      workflow={workflow(availableTransitions)}
      document={document}
      isActive={true}
    />,
    { wrapper: Wrapper },
  );
  const rerender = (transitions: string[]) =>
    view.rerender(
      <ConfirmPromptRenderer
        parentWorkflow={parentWorkflow}
        workflow={workflow(transitions)}
        document={document}
        isActive={true}
      />,
    );
  return { ...view, rerender, processor };
}

const yesButton = () => screen.getByRole('button', { name: /yes/i });
const noButton = () => screen.getByRole('button', { name: /no/i });

describe('ConfirmPromptRenderer', () => {
  it('stays busy after the run mutation resolves, because that only means "queued"', async () => {
    const { container, processor } = renderConfirm();

    await waitFor(() => expect(yesButton()).toBeEnabled());
    fireEvent.click(yesButton());

    await waitFor(() =>
      expect(processor.run).toHaveBeenCalledWith('wf-parent', {
        transition: { id: TRANSITION, workflowId: 'wf-child', payload: { answer: 'yes' } },
      }),
    );

    // The POST has settled here, but the worker has not applied the transition yet: re-enabling now
    // would show the user an untouched prompt and no sign their click did anything.
    await waitFor(() => expect(processor.run).toHaveBeenCalledTimes(1));
    expect(yesButton()).toBeDisabled();
    expect(noButton()).toBeDisabled();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('releases the prompt once the workflow stops offering the transition', async () => {
    const { container, rerender } = renderConfirm();

    await waitFor(() => expect(yesButton()).toBeEnabled());
    fireEvent.click(yesButton());
    await waitFor(() => expect(container.querySelector('.animate-spin')).toBeInTheDocument());

    // The refreshed workflow has left the waiting place — the answer is in.
    rerender([]);

    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });
});
