import { z } from 'zod';
import { ToolEnvelope } from '../interfaces/handler.interface.js';
import { getBlockName, getBlockResultSchema } from './block-metadata.utils.js';

/**
 * Validates a tool's success envelope against its declared `resultSchema`.
 *
 * Error and pending envelopes pass through untouched — they carry no data contract. Tools
 * without a `resultSchema` are not validated. On success, returns a new envelope with the
 * parsed data; the input envelope is never mutated, so recorders holding a reference keep
 * the raw tool output.
 */
export function parseToolResult<TResult, TMeta>(
  tool: object,
  envelope: ToolEnvelope<TResult, TMeta>,
): ToolEnvelope<TResult, TMeta> {
  if (envelope.error !== undefined || envelope.pending !== undefined) return envelope;

  const resultSchema = getBlockResultSchema(tool);
  if (!resultSchema) return envelope;

  try {
    return { ...envelope, data: resultSchema.parse(envelope.data) as TResult };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Tool '${getBlockName(tool)}' result violates its resultSchema: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
}
