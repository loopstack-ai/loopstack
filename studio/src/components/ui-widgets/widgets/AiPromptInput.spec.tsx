import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AiPromptInput from './AiPromptInput';

/** Two fields whose defaults read the same — the case where a bare value cannot say which field it is. */
const FIELDS = [
  { name: 'also', label: 'Also', options: ['none', 'core'], default: 'none' },
  { name: 'priority', label: 'Priority', options: ['none', 'high'], default: 'none' },
];

describe('AiPromptInput', () => {
  it('shows each field label inside its select, beside the chosen value', () => {
    render(<AiPromptInput onSubmit={vi.fn()} ui={{ fields: FIELDS }} />);

    // Every field always holds a value, so a placeholder never renders — the label has to be visible text,
    // not only the accessible name.
    for (const { label } of FIELDS) {
      const trigger = screen.getByRole('combobox', { name: label });
      expect(within(trigger).getByText(label)).toBeVisible();
      expect(within(trigger).getByText('none')).toBeVisible();
    }
  });

  it('submits the text with each field value', async () => {
    const onSubmit = vi.fn();
    render(<AiPromptInput onSubmit={onSubmit} ui={{ fields: FIELDS }} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A thought' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({ text: 'A thought', also: 'none', priority: 'none' });
  });
});
