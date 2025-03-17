import { z } from 'zod';

export const ActionCallSchema = z.object({
    action: z.string(),
    props: z.any().optional(),
})

export type ActionCallType = z.infer<typeof ActionCallSchema>;
