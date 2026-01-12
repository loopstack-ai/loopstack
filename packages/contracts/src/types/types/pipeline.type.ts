import { z } from 'zod';
import {
  PipelineFactoryConfigSchema,
  PipelineFactoryIteratorConfigSchema,
  PipelineFactoryIteratorSchema,
  PipelineFactorySchema,
  PipelineItemConfigSchema,
  PipelineItemSchema,
  PipelineSequenceSchema,
} from '../../schemas';

export type PipelineItemConfigType = z.infer<typeof PipelineItemConfigSchema>;
export type PipelineItemType = z.infer<typeof PipelineItemSchema>;
export type PipelineFactoryIteratorConfigType = z.infer<typeof PipelineFactoryIteratorConfigSchema>;
export type PipelineFactoryConfigType = z.infer<typeof PipelineFactoryConfigSchema>;
export type PipelineFactoryIteratorType = z.infer<typeof PipelineFactoryIteratorSchema>;
export type PipelineFactoryType = z.infer<typeof PipelineFactorySchema>;
export type PipelineSequenceType = z.infer<typeof PipelineSequenceSchema>;
