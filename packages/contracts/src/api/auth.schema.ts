import { z } from 'zod';

export const AuthUserSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
  roles: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type AuthUserInterface = z.infer<typeof AuthUserSchema>;

export const WorkerInfoSchema = z.object({
  clientId: z.string().optional(),
  isConfigured: z.boolean(),
  timestamp: z.iso.datetime(),
});
export type WorkerInfoInterface = z.infer<typeof WorkerInfoSchema>;

export const HubLoginRequestSchema = z.object({
  idToken: z.string().min(1),
});
export type HubLoginRequestInterface = z.infer<typeof HubLoginRequestSchema>;

export const HubLoginResponseSchema = z.object({
  id: z.string(),
  message: z.string(),
});
export type HubLoginResponseInterface = z.infer<typeof HubLoginResponseSchema>;

export const AuthMessageSchema = z.object({
  message: z.string(),
});
export type AuthMessageInterface = z.infer<typeof AuthMessageSchema>;
