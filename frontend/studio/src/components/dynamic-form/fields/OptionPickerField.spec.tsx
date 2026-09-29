import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { OptionPickerField, type OptionPickerValue } from './OptionPickerField';

const VALUE: OptionPickerValue = {
  options: [
    {
      value: 'A',
      label: 'Re-queue from the cron',
      summary: 'End the run and re-queue it.',
      detail: 'Smallest change.',
    },
    {
      value: 'B',
      label: 'Hold and check again',
      summary: 'Hold the run on a button.',
      detail: 'No timer.',
      recommended: true,
    },
  ],
  selected: 'B',
};

function renderField(value: Partial<OptionPickerValue> | undefined, { disabled = false } = {}) {
  const submitted = vi.fn();
  const Harness = () => {
    const form = useForm<Record<string, unknown>>({ defaultValues: { choice: value } });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(submitted)}>
          <OptionPickerField
            name="choice"
            schema={{ title: 'Options' }}
            ui={undefined}
            required={false}
            form={form}
            disabled={disabled}
            viewOnly={false}
            parentKey={null}
          />
          <button type="submit">Run</button>
        </form>
      </FormProvider>
    );
  };
  render(<Harness />);
  return { submitted };
}

describe('OptionPickerField', () => {
  it('draws each option as a block with its label, summary and detail, and marks the recommendation', () => {
    renderField(VALUE);
    expect(screen.getByText('A — Re-queue from the cron')).toBeInTheDocument();
    expect(screen.getByText('End the run and re-queue it.')).toBeInTheDocument();
    expect(screen.getByText('Smallest change.')).toBeInTheDocument();
    expect(screen.getByText('recommended')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /B — Hold and check again/ })).toBeChecked();
  });

  it('submits the same value with the pick changed', async () => {
    // The options travel with the pick, so whoever reads the payload needs nothing else to know what "A" was.
    const { submitted } = renderField(VALUE);
    fireEvent.click(screen.getByRole('radio', { name: /A — Re-queue/ }));
    screen.getByText('Run').click();
    await vi.waitFor(() => expect(submitted).toHaveBeenCalled());
    expect(submitted.mock.calls[0][0].choice).toEqual({ ...VALUE, selected: 'A' });
  });

  it('does not change the pick when the form is disabled', async () => {
    const { submitted } = renderField(VALUE, { disabled: true });
    fireEvent.click(screen.getByRole('radio', { name: /A — Re-queue/ }));
    screen.getByText('Run').click();
    await vi.waitFor(() => expect(submitted).toHaveBeenCalled());
    expect(submitted.mock.calls[0][0].choice.selected).toBe('B');
  });

  it('renders nothing without options', () => {
    renderField({ options: [] });
    expect(screen.queryByText('Options')).not.toBeInTheDocument();
    renderField(undefined);
    expect(screen.queryByText('Options')).not.toBeInTheDocument();
  });
});
