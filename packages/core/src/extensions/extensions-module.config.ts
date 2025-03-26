import { registerAs } from '@nestjs/config';

export default registerAs('llm', () => ({
  apiKey: process.env.LLM_API_KEY,
  defaultModel: process.env.LLM_DEFAULT_MODEL ?? 'gpt-3.5-turbo',
  defaultTemperature: process.env.LLM_DEFAULT_TEMPERATURE
    ? parseFloat(process.env.LLM_DEFAULT_TEMPERATURE)
    : 0,
}));
