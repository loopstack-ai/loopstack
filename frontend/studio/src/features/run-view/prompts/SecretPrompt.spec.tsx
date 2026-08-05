import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ParkView } from '@loopstack/contracts/park-view';
import { SecretPrompt } from './SecretPrompt.tsx';

const mutateAsync = vi.fn().mockResolvedValue({});
vi.mock('@/hooks/useSecrets.ts', () => ({
  useUpsertSecret: () => ({ mutateAsync }),
}));

const view: ParkView = {
  workflowId: 'wf',
  workflowName: 'probe',
  place: 'requesting_secrets',
  status: 'waiting',
  widget: 'secret-input',
  documentName: 'secret_request',
  content: { variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }] },
  transitions: ['secretsSubmitted'],
  defaultTransition: 'secretsSubmitted',
};

describe('SecretPrompt', () => {
  it('upserts each filled value and submits only the saved keys', async () => {
    const submit = vi.fn();
    render(<SecretPrompt view={view} submit={submit} isSubmitting={false} workspaceId="ws-1" />);

    fireEvent.change(screen.getByLabelText('EXAMPLE_API_KEY'), { target: { value: 'sk-123' } });
    // EXAMPLE_SECRET left empty — not upserted, not reported
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => expect(submit).toHaveBeenCalledWith({ keys: ['EXAMPLE_API_KEY'] }));
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({ workspaceId: 'ws-1', key: 'EXAMPLE_API_KEY', value: 'sk-123' });
  });

  it('renders nothing without a workspace — secrets cannot be stored', () => {
    const { container } = render(<SecretPrompt view={view} submit={vi.fn()} isSubmitting={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
