import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { CheckboxField } from '../CheckboxField';

const renderWithForm = (props: any) => {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: {
        [props.name]: props.schema?.default || false
      }
    });
    return (
      <FormProvider {...methods}>
        <CheckboxField {...props} form={methods} />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe('CheckboxField', () => {
  it('renders with label and allows checking/unchecking', () => {
    renderWithForm({
      name: 'subscribe',
      required: true,
      schema: {
        title: 'Subscribe to newsletter'
      }
    });

    const checkbox = screen.getByLabelText(/subscribe to newsletter/i);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('renders with default value checked', () => {
    renderWithForm({
      name: 'terms',
      required: false,
      schema: {
        title: 'Accept terms and conditions',
        default: true
      }
    });

    const checkbox = screen.getByLabelText(/accept terms and conditions/i);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('renders with help text', () => {
    renderWithForm({
      name: 'notifications',
      required: false,
      schema: {
        title: 'Enable notifications',
        help: 'You will receive email notifications'
      }
    });

    expect(screen.getByText('You will receive email notifications')).toBeInTheDocument();
  });

  it('renders with description as help text', () => {
    renderWithForm({
      name: 'marketing',
      required: false,
      schema: {
        title: 'Marketing emails',
        description: 'Receive promotional emails about new features'
      }
    });

    expect(screen.getByText('Receive promotional emails about new features')).toBeInTheDocument();
  });

  it('renders as disabled when disabled prop is true', () => {
    renderWithForm({
      name: 'premium',
      required: false,
      disabled: true,
      schema: {
        title: 'Premium features'
      }
    });

    const checkbox = screen.getByLabelText(/premium features/i);
    expect(checkbox).toBeDisabled();
  });

  it('renders as disabled when schema.disabled is true', () => {
    renderWithForm({
      name: 'premium',
      required: false,
      schema: {
        title: 'Premium features',
        disabled: true
      }
    });

    const checkbox = screen.getByLabelText(/premium features/i);
    expect(checkbox).toBeDisabled();
  });

  it('renders as readonly when schema.readonly is true', () => {
    renderWithForm({
      name: 'readonly_field',
      required: false,
      schema: {
        title: 'Readonly checkbox',
        readonly: true,
        default: true
      }
    });

    const checkbox = screen.getByLabelText(/readonly checkbox/i);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('uses field name as label when title is not provided', () => {
    renderWithForm({
      name: 'agreement',
      required: false,
      schema: {}
    });

    expect(screen.getByLabelText(/agreement/i)).toBeInTheDocument();
  });

  it('handles required field validation', () => {
    renderWithForm({
      name: 'required_field',
      required: true,
      schema: {
        title: 'Required Checkbox'
      }
    });

    const checkbox = screen.getByLabelText(/required checkbox/i);
    expect(checkbox).toHaveAttribute('aria-required', 'true');
  });

  it('renders without help text when not provided', () => {
    renderWithForm({
      name: 'simple',
      required: false,
      schema: {
        title: 'Simple checkbox'
      }
    });

    expect(screen.getByLabelText(/simple checkbox/i)).toBeInTheDocument();
    expect(screen.queryByText(/help/i)).not.toBeInTheDocument();
  });

  it('prioritizes help text over description when both are provided', () => {
    renderWithForm({
      name: 'priority_test',
      required: false,
      schema: {
        title: 'Priority Test',
        help: 'This is help text',
        description: 'This is description text'
      }
    });

    expect(screen.getByText('This is help text')).toBeInTheDocument();
    expect(screen.queryByText('This is description text')).not.toBeInTheDocument();
  });

  it('handles boolean value conversion correctly', () => {
    renderWithForm({
      name: 'boolean_test',
      required: false,
      schema: {
        title: 'Boolean Test',
        default: false
      }
    });

    const checkbox = screen.getByLabelText(/boolean test/i);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('handles truthy/falsy values correctly', () => {
    renderWithForm({
      name: 'truthy_test',
      required: false,
      schema: {
        title: 'Truthy Test'
      }
    });

    const checkbox = screen.getByLabelText(/truthy test/i);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('renders with both disabled prop and schema.disabled true', () => {
    renderWithForm({
      name: 'double_disabled',
      required: false,
      disabled: true,
      schema: {
        title: 'Double Disabled',
        disabled: true
      }
    });

    const checkbox = screen.getByLabelText(/double disabled/i);
    expect(checkbox).toBeDisabled();
  });

  it('handles empty schema gracefully', () => {
    renderWithForm({
      name: 'empty_schema',
      required: false,
      schema: {}
    });

    const checkbox = screen.getByLabelText(/empty_schema/i);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('maintains checkbox state after multiple interactions', () => {
    renderWithForm({
      name: 'state_test',
      required: false,
      schema: {
        title: 'State Test'
      }
    });

    const checkbox = screen.getByLabelText(/state test/i);

    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('handles readonly with default false', () => {
    renderWithForm({
      name: 'readonly_false',
      required: false,
      schema: {
        title: 'Readonly False',
        readonly: true,
        default: false
      }
    });

    const checkbox = screen.getByLabelText(/readonly false/i);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });
});
