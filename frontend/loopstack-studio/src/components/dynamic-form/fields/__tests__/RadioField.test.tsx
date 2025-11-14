import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { RadioField } from '../RadioField';

const renderWithForm = (props: any) => {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: {
        [props.name]: props.schema?.default || ''
      }
    });
    return (
      <FormProvider {...methods}>
        <RadioField {...props} form={methods} />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe('RadioField', () => {
  it('renders with label and radio options', () => {
    renderWithForm({
      name: 'gender',
      required: true,
      schema: {
        title: 'Gender',
        enum: ['male', 'female', 'other']
      }
    });

    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'male' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'female' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'other' })).toBeInTheDocument();
  });

  it('renders with custom enum options', () => {
    renderWithForm({
      name: 'size',
      required: false,
      schema: {
        title: 'Size',
        enumOptions: [
          { label: 'Small', value: 's' },
          { label: 'Medium', value: 'm' },
          { label: 'Large', value: 'l' }
        ]
      }
    });

    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Small' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Large' })).toBeInTheDocument();
  });

  it('allows radio selection', () => {
    renderWithForm({
      name: 'color',
      required: false,
      schema: {
        title: 'Color',
        enum: ['red', 'blue', 'green']
      }
    });

    const redRadio = screen.getByRole('radio', { name: 'red' });
    const blueRadio = screen.getByRole('radio', { name: 'blue' });

    expect(redRadio).toHaveAttribute('aria-checked', 'false');
    expect(blueRadio).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(redRadio);
    expect(redRadio).toHaveAttribute('aria-checked', 'true');
    expect(blueRadio).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(blueRadio);
    expect(redRadio).toHaveAttribute('aria-checked', 'false');
    expect(blueRadio).toHaveAttribute('aria-checked', 'true');
  });

  it('renders with default value selected', () => {
    renderWithForm({
      name: 'priority',
      required: false,
      schema: {
        title: 'Priority',
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    });

    const lowRadio = screen.getByRole('radio', { name: 'low' });
    const mediumRadio = screen.getByRole('radio', { name: 'medium' });
    const highRadio = screen.getByRole('radio', { name: 'high' });

    expect(lowRadio).toHaveAttribute('aria-checked', 'false');
    expect(mediumRadio).toHaveAttribute('aria-checked', 'true');
    expect(highRadio).toHaveAttribute('aria-checked', 'false');
  });

  it('renders with help text', () => {
    renderWithForm({
      name: 'plan',
      required: false,
      schema: {
        title: 'Plan',
        enum: ['basic', 'premium'],
        help: 'Choose your subscription plan'
      }
    });

    expect(screen.getByText('Choose your subscription plan')).toBeInTheDocument();
  });

  it('renders with description as help text', () => {
    renderWithForm({
      name: 'plan',
      required: false,
      schema: {
        title: 'Plan',
        enum: ['basic', 'premium'],
        description: 'Select the plan that suits you'
      }
    });

    expect(screen.getByText('Select the plan that suits you')).toBeInTheDocument();
  });

  it('renders as disabled when disabled prop is true', () => {
    renderWithForm({
      name: 'status',
      required: false,
      disabled: true,
      schema: {
        title: 'Status',
        enum: ['active', 'inactive']
      }
    });

    const activeRadio = screen.getByRole('radio', { name: 'active' });
    const inactiveRadio = screen.getByRole('radio', { name: 'inactive' });

    expect(activeRadio).toBeDisabled();
    expect(inactiveRadio).toBeDisabled();
  });

  it('renders as disabled when schema.disabled is true', () => {
    renderWithForm({
      name: 'status',
      required: false,
      schema: {
        title: 'Status',
        enum: ['active', 'inactive'],
        disabled: true
      }
    });

    const activeRadio = screen.getByRole('radio', { name: 'active' });
    const inactiveRadio = screen.getByRole('radio', { name: 'inactive' });

    expect(activeRadio).toBeDisabled();
    expect(inactiveRadio).toBeDisabled();
  });

  it('renders as readonly when schema.readonly is true', () => {
    renderWithForm({
      name: 'type',
      required: false,
      schema: {
        title: 'Type',
        enum: ['public', 'private'],
        readonly: true,
        default: 'public'
      }
    });

    const publicRadio = screen.getByRole('radio', { name: 'public' });
    const privateRadio = screen.getByRole('radio', { name: 'private' });

    expect(publicRadio).toHaveAttribute('aria-checked', 'true');
    expect(privateRadio).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(privateRadio);
    expect(publicRadio).toHaveAttribute('aria-checked', 'true');
    expect(privateRadio).toHaveAttribute('aria-checked', 'false');
  });

  it('renders in inline layout when schema.inline is true', () => {
    renderWithForm({
      name: 'alignment',
      required: false,
      schema: {
        title: 'Alignment',
        enum: ['left', 'center', 'right'],
        inline: true
      }
    });

    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveAttribute('aria-label', 'Alignment');

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('uses field name as label when title is not provided', () => {
    renderWithForm({
      name: 'category',
      required: false,
      schema: {
        enum: ['fiction', 'non-fiction', 'biography']
      }
    });

    expect(screen.getByText('category')).toBeInTheDocument();
  });

  it('renders with custom enumOptions labels and values', () => {
    renderWithForm({
      name: 'difficulty',
      required: false,
      schema: {
        title: 'Difficulty Level',
        enumOptions: [
          { label: 'Beginner', value: 'easy' },
          { label: 'Intermediate', value: 'medium' },
          { label: 'Advanced', value: 'hard' }
        ]
      }
    });

    expect(screen.getByRole('radio', { name: 'Beginner' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Intermediate' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Advanced' })).toBeInTheDocument();

    const beginnerRadio = screen.getByRole('radio', { name: 'Beginner' }) as HTMLInputElement;
    expect(beginnerRadio.value).toBe('easy');
  });

  it('renders empty when no enum or enumOptions provided', () => {
    renderWithForm({
      name: 'empty',
      required: false,
      schema: {
        title: 'Empty Field'
      }
    });

    expect(screen.getByText('Empty Field')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('handles required field validation', () => {
    renderWithForm({
      name: 'required_field',
      required: true,
      schema: {
        title: 'Required Field',
        enum: ['option1', 'option2']
      }
    });

    const fieldset = screen.getByRole('radiogroup');
    expect(fieldset).toHaveAttribute('aria-required', 'true');
  });
});
