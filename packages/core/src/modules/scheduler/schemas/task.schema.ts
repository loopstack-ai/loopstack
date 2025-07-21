import { z } from 'zod';

export const cronExpressionSchema = z.string().refine((value) => {
  try {
    const parts = value.split(' ');
    if (parts.length !== 5) return false;

    // Basic validation - you can enhance this further
    const cronRegex = /^(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)$/;
    return cronRegex.test(value);
  } catch {
    return false;
  }
}, {
  message: 'Invalid cron expression format'
});

export const isoDateStringSchema = z.string().refine((value) => {
  try {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString() === value;
  } catch {
    return false;
  }
}, {
  message: 'Invalid ISO date string'
});