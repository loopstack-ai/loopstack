import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MultiSelectField, type MultiSelectValue } from './MultiSelectField';

const VALUE: MultiSelectValue = {
  options: ['packages', 'packages/core', 'packages/cli', 'studio'],
  selected: ['packages/core'],
};

beforeAll(() => {
  // cmdk scrolls the highlighted entry into view, which jsdom does not implement.
  Element.prototype.scrollIntoView = vi.fn();
});

function renderField(
  value: Partial<MultiSelectValue> | undefined,
  { required = false, disabled = false }: { required?: boolean; disabled?: boolean } = {},
) {
  const submitted = vi.fn();
  const Harness = () => {
    const form = useForm<Record<string, unknown>>({ defaultValues: { units: value } });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(submitted)}>
          <MultiSelectField
            name="units"
            schema={{ title: 'Units' }}
            ui={undefined}
            required={required}
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

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Units' }));

async function submit(submitted: ReturnType<typeof vi.fn>) {
  fireEvent.click(screen.getByText('Run'));
  await vi.waitFor(() => expect(submitted).toHaveBeenCalled());
  return submitted.mock.calls[0][0].units as MultiSelectValue;
}

describe('MultiSelectField', () => {
  it('shows the picks, and lists the options the value carries', () => {
    renderField(VALUE);
    expect(screen.getByText('packages/core')).toBeInTheDocument();
    expect(screen.queryByText('packages/cli')).not.toBeInTheDocument();
    open();
    for (const option of VALUE.options) expect(screen.getAllByText(option).length).toBeGreaterThan(0);
  });

  it('submits every entry clicked, beside the picks it started with', async () => {
    const { submitted } = renderField(VALUE);
    open();
    fireEvent.click(screen.getByText('packages/cli'));
    fireEvent.click(screen.getByText('studio'));
    expect(await submit(submitted)).toEqual({ ...VALUE, selected: ['packages/core', 'packages/cli', 'studio'] });
  });

  it('removes a pick from its chip, and from the list by clicking it again', async () => {
    const { submitted } = renderField({ ...VALUE, selected: ['packages/core', 'studio'] });
    fireEvent.click(screen.getByRole('button', { name: 'Remove packages/core' }));
    open();
    fireEvent.click(screen.getByRole('option', { name: 'studio' }));
    expect((await submit(submitted)).selected).toEqual([]);
  });

  it('adds a name the list does not hold, from the search', async () => {
    // A list read from what exists cannot hold what the work is about to create.
    const { submitted } = renderField(VALUE);
    open();
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'packages/new' } });
    fireEvent.click(screen.getByText(/^Add/));
    const units = await submit(submitted);
    expect(units.selected).toEqual(['packages/core', 'packages/new']);
    expect(units.options).toEqual(VALUE.options);
  });

  it('will not submit a required field with nothing picked', async () => {
    const { submitted } = renderField({ options: VALUE.options, selected: [] }, { required: true });
    fireEvent.click(screen.getByText('Run'));
    expect(await screen.findByRole('alert')).toHaveTextContent('This field is required');
    expect(submitted).not.toHaveBeenCalled();
  });

  it('treats a value of any other shape as nothing picked', async () => {
    const { submitted } = renderField('packages/core' as unknown as MultiSelectValue, { required: true });
    fireEvent.click(screen.getByText('Run'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submitted).not.toHaveBeenCalled();
  });

  it('offers no changes when the field is disabled', () => {
    renderField(VALUE, { disabled: true });
    expect(screen.getByRole('button', { name: 'Units' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remove packages/core' })).not.toBeInTheDocument();
  });
});
