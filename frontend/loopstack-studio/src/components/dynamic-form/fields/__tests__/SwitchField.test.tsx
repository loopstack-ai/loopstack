import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { SwitchField } from '../SwitchField';

const renderWithForm = (props: any) => {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: {
        [props.name]: props.schema?.default || false
      }
    });
    return (
      <FormProvider {...methods}>
        <SwitchField {...props} form={methods} />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe('SwitchField', () => {
  it('renders with label and allows toggling', () => {
    renderWithForm({
      name: 'notifications',
      required: true,
      schema: {
        title: 'Enable Notifications',
        type: 'boolean'
      }
    });

    const switchElement = screen.getByRole('switch', { name: /enable notifications/i });
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).not.toBeChecked();

    fireEvent.click(switchElement);
    expect(switchElement).toBeChecked();

    fireEvent.click(switchElement);
    expect(switchElement).not.toBeChecked();
  });

  it('renders as disabled when disabled prop is true', () => {
    renderWithForm({
      name: 'notifications',
      required: false,
      disabled: true,
      schema: {
        title: 'Enable Notifications',
        type: 'boolean'
      }
    });

    const switchElement = screen.getByRole('switch', { name: /enable notifications/i });
    expect(switchElement).toHaveAttribute('data-disabled', '');
    fireEvent.click(switchElement);
    expect(switchElement).not.toBeChecked();
  });

  it('renders as disabled when schema.disabled is true', () => {
    renderWithForm({
      name: 'notifications',
      required: false,
      schema: {
        title: 'Enable Notifications',
        type: 'boolean',
        disabled: true
      }
    });

    const switchElement = screen.getByRole('switch', { name: /enable notifications/i });
    expect(switchElement).toHaveAttribute('data-disabled', '');
    fireEvent.click(switchElement);
    expect(switchElement).not.toBeChecked();
  });

  it('renders as readonly and prevents changes when schema.readonly is true', () => {
    renderWithForm({
      name: 'notifications',
      required: false,
      schema: {
        title: 'Enable Notifications',
        type: 'boolean',
        default: true,
        readonly: true
      }
    });

    const switchElement = screen.getByRole('switch', { name: /enable notifications/i });
    expect(switchElement).toBeChecked();

    fireEvent.click(switchElement);
    expect(switchElement).toBeChecked();
  });

  it('renders with default value true', () => {
    renderWithForm({
      name: 'darkMode',
      required: false,
      schema: {
        title: 'Dark Mode',
        type: 'boolean',
        default: true
      }
    });

    const switchElement = screen.getByRole('switch', { name: /dark mode/i });
    expect(switchElement).toBeChecked();
  });

  it('renders with default value false', () => {
    renderWithForm({
      name: 'autoSave',
      required: false,
      schema: {
        title: 'Auto Save',
        type: 'boolean',
        default: false
      }
    });

    const switchElement = screen.getByRole('switch', { name: /auto save/i });
    expect(switchElement).not.toBeChecked();
  });

  it('defaults to false when no default is provided', () => {
    renderWithForm({
      name: 'notifications',
      required: false,
      schema: {
        title: 'Enable Notifications',
        type: 'boolean'
      }
    });

    const switchElement = screen.getByRole('switch', { name: /enable notifications/i });
    expect(switchElement).not.toBeChecked();
  });

  it('renders with help text', () => {
    renderWithForm({
      name: 'notifications',
      required: false,
      schema: {
        title: 'Enable Notifications',
        type: 'boolean',
        help: 'Toggle to receive push notifications'
      }
    });

    expect(screen.getByText('Toggle to receive push notifications')).toBeInTheDocument();
  });

  it('renders with description as help text when help is not provided', () => {
    renderWithForm({
      name: 'notifications',
      required: false,
      schema: {
        title: 'Enable Notifications',
        type: 'boolean',
        description: 'Control notification preferences'
      }
    });

    expect(screen.getByText('Control notification preferences')).toBeInTheDocument();
  });

  it('uses name as label when title is not provided', () => {
    renderWithForm({
      name: 'enableFeature',
      required: false,
      schema: {
        type: 'boolean'
      }
    });

    expect(screen.getByText('enableFeature')).toBeInTheDocument();
  });

  it('handles toggle interaction correctly', () => {
    renderWithForm({
      name: 'feature',
      required: false,
      schema: {
        title: 'Feature Toggle',
        type: 'boolean',
        default: false
      }
    });

    const switchElement = screen.getByRole('switch', { name: /feature toggle/i });

    expect(switchElement).not.toBeChecked();

    fireEvent.click(switchElement);
    expect(switchElement).toBeChecked();
    fireEvent.click(switchElement);
    expect(switchElement).not.toBeChecked();

    fireEvent.click(switchElement);
    expect(switchElement).toBeChecked();
  });

  it('shows required indicator when required is true', () => {
    renderWithForm({
      name: 'termsAccepted',
      required: true,
      schema: {
        title: 'Accept Terms',
        type: 'boolean'
      }
    });

    const label = screen.getByText(/accept terms/i);
    expect(label).toBeInTheDocument();
    expect(label.className).toContain("after:content-['*']");
  });

  it('renders without help text when not provided', () => {
    renderWithForm({
      name: 'notifications',
      required: false,
      schema: {
        title: 'Enable Notifications',
        type: 'boolean'
      }
    });

    const switchElement = screen.getByRole('switch', { name: /enable notifications/i });
    expect(switchElement).toBeInTheDocument();

    const helpText = screen.queryByText(/toggle/i);
    expect(helpText).not.toBeInTheDocument();
  });

  it('maintains focus after interaction', () => {
    renderWithForm({
      name: 'notifications',
      required: false,
      schema: {
        title: 'Enable Notifications',
        type: 'boolean'
      }
    });

    const switchElement = screen.getByRole('switch', { name: /enable notifications/i });

    switchElement.focus();
    fireEvent.click(switchElement);

    expect(switchElement).toHaveFocus();
    expect(switchElement).toBeChecked();
  });

  it('handles boolean value correctly when checked', () => {
    renderWithForm({
      name: 'enabled',
      required: false,
      schema: {
        title: 'Enabled',
        type: 'boolean',
        default: true
      }
    });

    const switchElement = screen.getByRole('switch', { name: /enabled/i });
    expect(switchElement).toBeChecked();
  });

  it('handles boolean value correctly when unchecked', () => {
    renderWithForm({
      name: 'enabled',
      required: false,
      schema: {
        title: 'Enabled',
        type: 'boolean',
        default: false
      }
    });

    const switchElement = screen.getByRole('switch', { name: /enabled/i });
    expect(switchElement).not.toBeChecked();
  });
});
