import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { ObjectController } from './ObjectController';
import type { SchemaProperties } from './types';

const SCHEMA = {
  type: 'object',
  properties: {
    effort: { title: 'Effort', enum: ['small', 'medium', 'large'] },
    packages: { title: 'Packages', type: 'string' },
  },
  required: [],
};

/**
 * A gate card in miniature: nothing the schema insists on, one field the widget does.
 *
 * The split is the point. The card is stored the moment the analysis comes back, before anyone has filled
 * it in, so the schema cannot demand the field. The decision it carries cannot be taken without it.
 */
function renderObject(ui?: Record<string, unknown>) {
  const submitted = vi.fn();
  const Harness = () => {
    const form = useForm<Record<string, unknown>>({ defaultValues: {} });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(submitted)}>
          <ObjectController
            name={null}
            parentKey={null}
            schema={SCHEMA as unknown as SchemaProperties}
            ui={ui as SchemaProperties | undefined}
            form={form}
            disabled={false}
            required={true}
            viewOnly={false}
          />
          <button type="submit">Run</button>
        </form>
      </FormProvider>
    );
  };
  render(<Harness />);
  return { submitted };
}

/** The controller alone, for asserting on its layout wrapper. */
function Pair({ ui }: { ui: Record<string, unknown> | undefined }) {
  const form = useForm<Record<string, unknown>>({ defaultValues: {} });
  return (
    <FormProvider {...form}>
      <ObjectController
        name={null}
        parentKey={null}
        schema={SCHEMA as unknown as SchemaProperties}
        ui={ui as SchemaProperties | undefined}
        form={form}
        disabled={false}
        required={true}
        viewOnly={false}
      />
    </FormProvider>
  );
}

describe('ObjectController', () => {
  it('marks a field the widget requires, though the schema does not', () => {
    renderObject({ properties: { effort: { required: true } } });
    // The asterisk is the wrapper's mark for a required field.
    expect(screen.getByText('Effort').className).toContain("after:content-['*']");
  });

  it('leaves the other fields alone', () => {
    renderObject({ properties: { effort: { required: true } } });
    expect(screen.getByText('Packages').className).not.toContain("after:content-['*']");
  });

  it('asks for nothing when the widget asks for nothing', () => {
    renderObject();
    expect(screen.getByText('Effort').className).not.toContain("after:content-['*']");
  });

  it('puts two compact inputs side by side, and stacks a pair that includes a block', () => {
    const { container: compact } = render(<Pair ui={undefined} />);
    expect(compact.firstElementChild?.className).toContain('grid-cols-2');

    const { container: withBlock } = render(<Pair ui={{ properties: { packages: { widget: 'markdown-view' } } }} />);
    expect(withBlock.firstElementChild?.className ?? '').not.toContain('grid-cols-2');
  });

  it('still honours what the schema itself requires', () => {
    const schemaRequired = { ...SCHEMA, required: ['packages'] };
    const submitted = vi.fn();
    const Harness = () => {
      const form = useForm<Record<string, unknown>>({ defaultValues: {} });
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(submitted)}>
            <ObjectController
              name={null}
              parentKey={null}
              schema={schemaRequired as unknown as SchemaProperties}
              ui={undefined}
              form={form}
              disabled={false}
              required={true}
              viewOnly={false}
            />
          </form>
        </FormProvider>
      );
    };
    render(<Harness />);
    expect(screen.getByText('Packages').className).toContain("after:content-['*']");
  });
});
