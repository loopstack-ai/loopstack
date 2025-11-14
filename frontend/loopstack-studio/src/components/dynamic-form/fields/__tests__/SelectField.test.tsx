import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { SelectField } from '../SelectField';

window.HTMLElement.prototype.scrollIntoView = function () {};

const renderWithForm = (props: any) => {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: {
        [props.name]: props.schema?.default || ''
      }
    });
    return (
      <FormProvider {...methods}>
        <SelectField {...props} form={methods} />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe('SelectField', () => {
  it('renders with label and select options', async () => {
    renderWithForm({
      name: 'country',
      required: true,
      schema: {
        title: 'Country',
        enum: ['USA', 'Canada', 'UK']
      }
    });

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      const matches = screen.getAllByText(/country/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('USA')).toBeInTheDocument();
      expect(screen.getByText('Canada')).toBeInTheDocument();
      expect(screen.getByText('UK')).toBeInTheDocument();
    });
  });

  it('renders with custom enum options', async () => {
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

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      const matches = screen.getAllByText(/size/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
    });
  });

  it('allows option selection', async () => {
    renderWithForm({
      name: 'color',
      required: false,
      schema: {
        title: 'Color',
        enum: ['red', 'blue', 'green']
      }
    });

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('Select Color');

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('red')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('red'));

    await waitFor(() => {
      expect(trigger).toHaveTextContent('red');
    });
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

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('medium');
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

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
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

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('uses field name as label when title is not provided', () => {
    renderWithForm({
      name: 'category',
      required: false,
      schema: {
        enum: ['fiction', 'non-fiction', 'biography']
      }
    });

    const matches = screen.getAllByText(/category/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with custom enumOptions labels and values', async () => {
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

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Beginner')).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Beginner', { exact: false }));

    await waitFor(() => {
      expect(trigger).toHaveTextContent('Beginner');
    });
  });

  it('renders empty placeholder option', async () => {
    renderWithForm({
      name: 'optional',
      required: false,
      schema: {
        title: 'Optional Field',
        enum: ['option1', 'option2']
      }
    });

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Select Optional Field')).toBeInTheDocument();
    });
  });

  it('handles empty enum array', async () => {
    renderWithForm({
      name: 'empty',
      required: false,
      schema: {
        title: 'Empty Field',
        enum: []
      }
    });

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Select Empty Field')).toBeInTheDocument();
      expect(screen.getAllByText('Select Empty Field')).toHaveLength(1);
    });
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

    const matches = screen.getAllByText(/required field/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('handles undefined/null enum gracefully', () => {
    renderWithForm({
      name: 'undefined_enum',
      required: false,
      schema: {
        title: 'Undefined Enum'
      }
    });

    const matches = screen.getAllByText(/undefined enum/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
