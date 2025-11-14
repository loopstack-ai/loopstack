import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { TextField } from '../TextField';

const renderWithForm = (props: any) => {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: {
        [props.name]: props.schema?.default || ''
      }
    });
    return (
      <FormProvider {...methods}>
        <TextField {...props} form={methods} />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe('TextField', () => {
  it('renders with label and allows input', async () => {
    renderWithForm({
      name: 'username',
      required: true,
      schema: {
        title: 'Username',
        type: 'string',
        placeholder: 'Enter your name'
      }
    });

    const input = screen.getByRole('textbox', { name: /username/i }) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toBe('Enter your name');

    fireEvent.change(input, { target: { value: 'Tobi' } });
    expect(input.value).toBe('Tobi');
  });

  it('renders textarea when widget is textarea', () => {
    renderWithForm({
      name: 'description',
      required: false,
      schema: {
        title: 'Description',
        type: 'string',
        widget: 'textarea',
        placeholder: 'Enter description'
      }
    });

    const textarea = screen.getByRole('textbox', { name: /description/i }) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toBeInTheDocument();
    expect(textarea.placeholder).toBe('Enter description');
  });

  it('renders as disabled when disabled prop is true', () => {
    renderWithForm({
      name: 'username',
      required: false,
      disabled: true,
      schema: {
        title: 'Username',
        type: 'string'
      }
    });

    const input = screen.getByRole('textbox', { name: /username/i }) as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('renders as readonly when schema.readonly is true', () => {
    renderWithForm({
      name: 'username',
      required: false,
      schema: {
        title: 'Username',
        type: 'string',
        readonly: true,
        default: 'TEST'
      }
    });

    const input = screen.getByRole('textbox', { name: /username/i }) as HTMLInputElement;
    expect(input).toHaveAttribute('readonly');
    console.log(input.value);
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'New Value' } });
    expect(input.value).toBe('TEST');
  });

  it('renders with default value', () => {
    renderWithForm({
      name: 'username',
      required: false,
      schema: {
        title: 'Username',
        type: 'string',
        default: 'John Doe'
      }
    });

    const input = screen.getByRole('textbox', { name: /username/i }) as HTMLInputElement;
    expect(input.value).toBe('John Doe');
  });

  it('renders with help text', () => {
    renderWithForm({
      name: 'username',
      required: false,
      schema: {
        title: 'Username',
        type: 'string',
        help: 'Enter your username here'
      }
    });

    expect(screen.getByText('Enter your username here')).toBeInTheDocument();
  });

  it('renders number input for number type', () => {
    renderWithForm({
      name: 'age',
      required: false,
      schema: {
        title: 'Age',
        type: 'number',
        minimum: 0,
        maximum: 100
      }
    });

    const input = screen.getByRole('spinbutton', { name: /age/i }) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('number');
    expect(input.min).toBe('0');
    expect(input.max).toBe('100');
  });

  it('renders in view-only mode', () => {
    renderWithForm({
      name: 'username',
      required: false,
      viewOnly: true,
      schema: {
        title: 'Username',
        type: 'string',
        default: 'John Doe'
      }
    });

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
