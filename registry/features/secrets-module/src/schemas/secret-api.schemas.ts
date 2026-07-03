import { z } from 'zod';

export const SecretWriteSchema = z.object({
  key: z.string().min(1).max(200),
  value: z.string(),
});
export type SecretWriteInterface = z.infer<typeof SecretWriteSchema>;

export const SecretUpdateSchema = z.object({
  value: z.string().optional(),
});
export type SecretUpdateInterface = z.infer<typeof SecretUpdateSchema>;

/** Wire shape of a secret — the value itself never leaves the server. */
export interface SecretItemInterface {
  id: string;
  key: string;
  hasValue: boolean;
}
