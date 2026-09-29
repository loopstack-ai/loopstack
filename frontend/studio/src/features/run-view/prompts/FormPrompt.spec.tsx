import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ParkView } from '@loopstack/contracts/park-view';
import { FormPrompt } from './FormPrompt.tsx';

/** A gate as the engineer declares one: a Markdown heading, short fields, folded detail, three actions. */
const view: ParkView = {
  workflowId: 'wf',
  workflowName: 'probe',
  place: 'review',
  status: 'waiting',
  widget: 'form',
  documentName: 'review_form',
  content: {
    markdown: '### Ticket #7\n\nThe **problem**.',
    title: 'Q3 report',
    approvedBy: '',
    summary: 'line one\nline two',
    area: 'core',
    detail: '## Everything else',
  },
  schema: {
    type: 'object',
    properties: {
      markdown: { type: 'string' },
      title: { type: 'string', readonly: true },
      approvedBy: { type: 'string', title: 'Approved by' },
      summary: { type: 'string' },
      area: { type: 'string', enum: ['core', 'studio'] },
      detail: { type: 'string' },
    },
  },
  options: {
    properties: {
      summary: { widget: 'textarea', title: 'The problem', rows: 3 },
      detail: { widget: 'markdown-collapsed', title: 'The full analysis' },
    },
    actions: [
      { label: 'Close', transition: 'closed', variant: 'outline' },
      { label: 'Approve', transition: 'approved' },
      { label: 'Later', transition: 'unavailable' },
    ],
  },
  transitions: ['approved', 'closed'],
  defaultTransition: 'approved',
};

describe('FormPrompt', () => {
  it('seeds the fields from the content and locks read-only ones', () => {
    render(<FormPrompt view={view} submit={vi.fn()} isSubmitting={false} />);
    expect(screen.getByLabelText('title')).toHaveValue('Q3 report');
    expect(screen.getByLabelText('title')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Approved by')).toBeEnabled();
    expect(screen.getByLabelText('Approved by')).not.toHaveAttribute('readonly');
  });

  it('draws each field as the document declared it', () => {
    render(<FormPrompt view={view} submit={vi.fn()} isSubmitting={false} />);
    // A textarea with its rows, not a single-line input holding the whole block.
    const summary = screen.getByLabelText('The problem');
    expect(summary.tagName).toBe('TEXTAREA');
    expect(summary).toHaveAttribute('rows', '3');
    expect(summary).toHaveValue('line one\nline two');
    // An enum is a choice.
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    // The folded detail starts closed: its opener is drawn, its content is not.
    expect(screen.getByText('The full analysis')).toBeInTheDocument();
    expect(screen.queryByText('Everything else')).not.toBeInTheDocument();
  });

  it('renders the markdown heading as Markdown even when no widget is declared for it', () => {
    render(<FormPrompt view={view} submit={vi.fn()} isSubmitting={false} />);
    // The CLI prints `content.markdown` as the form's heading, so the run view reads it the same way.
    expect(screen.getByRole('heading', { name: 'Ticket #7' })).toBeInTheDocument();
    expect(screen.getByText('problem').tagName).toBe('STRONG');
    expect(screen.queryByLabelText('markdown')).not.toBeInTheDocument();
  });

  it('offers only actions whose transition is available, in the style each declares', () => {
    render(<FormPrompt view={view} submit={vi.fn()} isSubmitting={false} />);
    expect(screen.queryByText('Later')).not.toBeInTheDocument();
    // The declaration decides the style, not the position: the first action here is the lesser one.
    expect(screen.getByText('Close').className).not.toContain('bg-primary');
    expect(screen.getByText('Approve').className).toContain('bg-primary');
  });

  it('submits the edited payload through the clicked action', async () => {
    const submit = vi.fn();
    render(<FormPrompt view={view} submit={submit} isSubmitting={false} />);

    fireEvent.change(screen.getByLabelText('Approved by'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByText('Close'));

    await vi.waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Q3 report', approvedBy: 'Ada' }), 'closed');
  });

  it('names the field when a submit is refused, instead of doing nothing', async () => {
    const submit = vi.fn();
    const strict: ParkView = {
      ...view,
      content: { approvedBy: '' },
      schema: { type: 'object', properties: { approvedBy: { type: 'string' } }, required: ['approvedBy'] },
      options: { actions: [{ label: 'Approve', transition: 'approved' }] },
    };
    render(<FormPrompt view={strict} submit={submit} isSubmitting={false} />);

    fireEvent.click(screen.getByText('Approve'));

    // The field marks itself too; what this asserts is the notice next to the buttons, where you clicked.
    await vi.waitFor(() => expect(screen.getByText(/Not submitted/)).toBeInTheDocument());
    expect(screen.getByText(/Not submitted/)).toHaveTextContent('approvedBy');
    expect(submit).not.toHaveBeenCalled();
  });

  it('renders nothing when none of its actions can fire', () => {
    const { container } = render(
      <FormPrompt view={{ ...view, transitions: [] }} submit={vi.fn()} isSubmitting={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
