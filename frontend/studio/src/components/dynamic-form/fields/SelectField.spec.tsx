import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { SelectField } from './SelectField';

const OPTIONS = ['core', 'test', 'documentation'];

/**
 * Render the field inside a form and hand the test the submitted values.
 *
 * What matters here is what leaves the form, not what is drawn: an enum field that submits an empty string
 * for "not chosen" sends a value the server's schema cannot accept, and the failure only shows up there.
 */
function renderField({ required = false, schemaDefault }: { required?: boolean; schemaDefault?: string } = {}) {
  const submitted = vi.fn();
  const Harness = () => {
    const form = useForm<Record<string, unknown>>({ defaultValues: {} });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(submitted)}>
          <SelectField
            name="area"
            schema={{ title: 'Area', enum: OPTIONS, ...(schemaDefault ? { default: schemaDefault } : {}) }}
            ui={undefined}
            required={required}
            form={form}
            disabled={false}
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

/** Radix opens on keyboard too, which jsdom handles where its pointer path does not. */
function openMenu() {
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
}

describe('SelectField', () => {
  it('omits an untouched optional field instead of submitting an empty string', async () => {
    // An empty string is a real value for a string field and a type error for an enum. Sending one makes
    // `z.enum([...]).optional()` reject the args, so a blank dropdown becomes impossible to leave blank.
    const { submitted } = renderField();
    screen.getByText('Run').click();
    await vi.waitFor(() => expect(submitted).toHaveBeenCalled());
    expect(submitted.mock.calls[0][0].area).toBeUndefined();
  });

  it('still submits a schema default when there is one', async () => {
    const { submitted } = renderField({ schemaDefault: 'core' });
    screen.getByText('Run').click();
    await vi.waitFor(() => expect(submitted).toHaveBeenCalled());
    expect(submitted.mock.calls[0][0].area).toBe('core');
  });

  it('shows the placeholder rather than a value when nothing is chosen', () => {
    renderField();
    expect(screen.getByText('Select Area')).toBeInTheDocument();
  });

  it('offers a way to unset an optional field, so a first choice is not permanent', () => {
    renderField();
    openMenu();
    // Radix renders each entry twice — once in the popup, once in the hidden native select it keeps for
    // form compatibility — so presence is what this asserts, not how many.
    expect(screen.getAllByText('— none —').length).toBeGreaterThan(0);
    for (const option of OPTIONS) expect(screen.getAllByText(option).length).toBeGreaterThan(0);
  });

  it('offers no such entry when the field is required', () => {
    renderField({ required: true });
    openMenu();
    expect(screen.queryAllByText('— none —')).toHaveLength(0);
    for (const option of OPTIONS) expect(screen.getAllByText(option).length).toBeGreaterThan(0);
  });
});
