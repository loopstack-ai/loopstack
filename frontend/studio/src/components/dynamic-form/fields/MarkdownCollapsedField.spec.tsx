import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { MarkdownCollapsedField } from './MarkdownCollapsedField';

function renderField({ content, open }: { content: string; open?: boolean }) {
  const Harness = () => {
    const form = useForm<Record<string, unknown>>({ defaultValues: { detail: content } });
    return (
      <FormProvider {...form}>
        <MarkdownCollapsedField
          name="detail"
          schema={{ title: 'The full analysis', ...(open === undefined ? {} : { open }) }}
          ui={undefined}
          required={false}
          form={form}
          disabled={false}
          viewOnly={false}
          parentKey={null}
        />
      </FormProvider>
    );
  };
  render(<Harness />);
}

describe('MarkdownCollapsedField', () => {
  it('shows its title without the content, so the detail starts out of the way', () => {
    renderField({ content: '## Root causes\n\nthe cause is here' });
    expect(screen.getByText('The full analysis')).toBeInTheDocument();
    // Radix keeps closed content out of the accessibility tree, which is what "collapsed" has to mean.
    expect(screen.queryByText('the cause is here')).not.toBeInTheDocument();
  });

  it('renders the content when it is asked to start open', () => {
    renderField({ content: 'the cause is here', open: true });
    expect(screen.getByText('the cause is here')).toBeInTheDocument();
  });

  it('renders nothing at all for empty content', () => {
    // An opener with nothing behind it is worse than no opener: it invites a click that does nothing.
    renderField({ content: '   ' });
    expect(screen.queryByText('The full analysis')).not.toBeInTheDocument();
  });
});
