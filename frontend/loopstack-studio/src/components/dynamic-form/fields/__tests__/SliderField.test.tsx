import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { describe, it, expect } from 'vitest';
import { SliderField } from '../SliderField';
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = () => {};
}

const renderWithForm = (props: any) => {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: {
        [props.name]: props.schema?.default || props.schema?.minimum || 0
      }
    });
    return (
      <FormProvider {...methods}>
        <SliderField {...props} form={methods} />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe('SliderField', () => {
  it('renders with label and allows interaction', () => {
    renderWithForm({
      name: 'volume',
      required: true,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100,
        default: 50
      }
    });

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(Number(slider.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(51);

    fireEvent.pointerDown(slider, { clientX: 999 });
    expect(Number(slider.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(100);
  });

  it('renders with custom min/max values', () => {
    renderWithForm({
      name: 'temperature',
      required: false,
      schema: {
        title: 'Temperature',
        type: 'number',
        minimum: -10,
        maximum: 40,
        default: 20
      }
    });

    const slider = screen.getByRole('slider', { name: /temperature/i });
    expect(slider).toHaveAttribute('aria-valuemin', '-10');
    expect(slider).toHaveAttribute('aria-valuemax', '40');
    expect(slider).toHaveAttribute('aria-valuenow', '20');

    expect(screen.getByText('-10')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('renders as disabled when disabled prop is true', () => {
    renderWithForm({
      name: 'volume',
      required: false,
      disabled: true,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100
      }
    });

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider).toHaveAttribute('data-disabled', '');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  it('renders as disabled when schema.disabled is true', () => {
    renderWithForm({
      name: 'volume',
      required: false,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100,
        disabled: true
      }
    });

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider).toHaveAttribute('data-disabled', '');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  it('renders as readonly and prevents changes when schema.readonly is true', () => {
    renderWithForm({
      name: 'volume',
      required: false,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100,
        default: 50,
        readonly: true
      }
    });

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '50');

    fireEvent.pointerDown(slider, { clientX: 999 });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders with default value', () => {
    renderWithForm({
      name: 'brightness',
      required: false,
      schema: {
        title: 'Brightness',
        type: 'number',
        minimum: 0,
        maximum: 100,
        default: 80
      }
    });

    const slider = screen.getByRole('slider', { name: /brightness/i });
    expect(slider).toHaveAttribute('aria-valuenow', '80');
  });

  it('uses minimum value as default when no default is provided', () => {
    renderWithForm({
      name: 'volume',
      required: false,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 10,
        maximum: 100
      }
    });

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider).toHaveAttribute('aria-valuenow', '10');
  });

  it('renders with help text', () => {
    renderWithForm({
      name: 'volume',
      required: false,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100,
        help: 'Adjust the volume level'
      }
    });

    expect(screen.getByText('Adjust the volume level')).toBeInTheDocument();
  });

  it('renders with description as help text when help is not provided', () => {
    renderWithForm({
      name: 'volume',
      required: false,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Control the audio volume'
      }
    });

    expect(screen.getByText('Control the audio volume')).toBeInTheDocument();
  });

  it('renders with custom step value (multipleOf)', () => {
    renderWithForm({
      name: 'price',
      required: false,
      schema: {
        title: 'Price',
        type: 'number',
        minimum: 0,
        maximum: 100,
        multipleOf: 5,
        default: 25
      }
    });

    const slider = screen.getByRole('slider', { name: /price/i });
    expect(slider).toHaveAttribute('aria-valuenow', '25');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '30'); // 25 + 5
  });

  it('uses step value of 1 when multipleOf is not provided', () => {
    renderWithForm({
      name: 'volume',
      required: false,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100
      }
    });

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '1');
  });

  it('shows required asterisk when required is true', () => {
    renderWithForm({
      name: 'volume',
      required: true,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100
      }
    });

    const requiredAsterisk = screen.getByText('*');
    expect(requiredAsterisk).toBeInTheDocument();
  });

  it('uses name as label when title is not provided', () => {
    renderWithForm({
      name: 'volumeLevel',
      required: false,
      schema: {
        type: 'number',
        minimum: 0,
        maximum: 100
      }
    });

    expect(screen.getByText('volumeLevel')).toBeInTheDocument();
  });

  it('handles edge case with zero as default value', () => {
    renderWithForm({
      name: 'volume',
      required: false,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100,
        default: 0
      }
    });

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  it('displays value labels automatically', () => {
    renderWithForm({
      name: 'volume',
      required: false,
      schema: {
        title: 'Volume',
        type: 'number',
        minimum: 0,
        maximum: 100,
        default: 50
      }
    });

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider).toHaveAttribute('aria-valuenow', '50');

    fireEvent.pointerDown(slider);
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });
});
