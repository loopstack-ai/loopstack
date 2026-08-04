import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ParkView } from '@loopstack/contracts/park-view';
import { FormPrompt } from './FormPrompt.tsx';

const view: ParkView = {
  workflowId: 'wf',
  workflowName: 'probe',
  place: 'review',
  status: 'waiting',
  widget: 'form',
  documentName: 'review_form',
  content: { title: 'Q3 report', approvedBy: '' },
  schema: {
    properties: {
      title: { type: 'string', readonly: true },
      approvedBy: { type: 'string', title: 'Approved by' },
    },
  },
  options: {
    actions: [
      { label: 'Approve', transition: 'approved' },
      { label: 'Reject', transition: 'rejected' },
      { label: 'Later', transition: 'unavailable' },
    ],
  },
  transitions: ['approved', 'rejected'],
  defaultTransition: 'approved',
};

describe('FormPrompt', () => {
  it('renders schema fields seeded from content, locks read-only fields', () => {
    render(<FormPrompt view={view} submit={vi.fn()} isSubmitting={false} />);
    expect(screen.getByLabelText('title')).toHaveValue('Q3 report');
    expect(screen.getByLabelText('title')).toBeDisabled();
    expect(screen.getByLabelText('Approved by')).toBeEnabled();
  });

  it('offers only actions whose transition is available and submits the edited payload', () => {
    const submit = vi.fn();
    render(<FormPrompt view={view} submit={submit} isSubmitting={false} />);

    expect(screen.queryByText('Later')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Approved by'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByText('Reject'));

    expect(submit).toHaveBeenCalledWith({ title: 'Q3 report', approvedBy: 'Ada' }, 'rejected');
  });
});
