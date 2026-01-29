import { Injectable } from '@nestjs/common';
import * as readline from 'readline';

export interface SelectOption {
  label: string;
  value: string;
}

@Injectable()
export class PromptService {
  async question(prompt: string, defaultValue?: string): Promise<string> {
    const displayPrompt = defaultValue ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(displayPrompt, (answer) => {
        rl.close();
        const result = answer.trim() || defaultValue || '';
        resolve(result);
      });
    });
  }

  async select(prompt: string, options: SelectOption[], defaultValue?: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(`\n${prompt}`);
    options.forEach((option, index) => {
      const isDefault = option.value === defaultValue;
      const marker = isDefault ? ' (default)' : '';
      console.log(`  ${index + 1}. ${option.label}${marker}`);
    });

    return new Promise((resolve) => {
      const defaultIndex = defaultValue ? options.findIndex((o) => o.value === defaultValue) + 1 : undefined;
      const promptText = defaultIndex ? `Select [${defaultIndex}]: ` : 'Select: ';

      rl.question(promptText, (answer) => {
        rl.close();

        const trimmed = answer.trim();
        if (!trimmed && defaultValue) {
          resolve(defaultValue);
          return;
        }

        const index = parseInt(trimmed, 10) - 1;
        if (index >= 0 && index < options.length) {
          resolve(options[index].value);
        } else {
          resolve(defaultValue || options[0].value);
        }
      });
    });
  }
}
