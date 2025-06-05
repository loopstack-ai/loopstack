import { z, ZodType } from 'zod';
import { Injectable } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import { MainConfigSchema, ToolConfigSchema, ToolOptionsInterface } from '@loopstack/shared';

@Injectable()
export class DynamicSchemaGeneratorService {
  private schema: ZodType;

  constructor(
    private readonly toolRegistry: ToolRegistry,
  ) {}

  // Simple Levenshtein distance function
  levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Find the most similar option
  findMostSimilar(input: string, options: string[]): string | null {
    let minDistance = Infinity;
    let mostSimilar = '';

    for (const option of options) {
      const distance = this.levenshteinDistance(
        input.toLowerCase(),
        option.toLowerCase(),
      );
      if (distance < minDistance) {
        minDistance = distance;
        mostSimilar = option;
      }
    }

    const maxLength = Math.max(input.length, mostSimilar.length);
    const similarity = (maxLength - minDistance) / maxLength;
    return similarity >= 0.7 ? mostSimilar : null;
  }

  createDiscriminatedServiceType(items: ToolOptionsInterface[]) {
    const configSchemas = items.map((options) =>
      z.object({
        service: z.literal(options.name),
        arguments: options.config ?? z.any(),
      }),
    );

    return z.discriminatedUnion('service', configSchemas as any, {
      errorMap: (issue, ctx) => {
        if (issue.code === 'invalid_union_discriminator') {
          const invalidValue = ctx.data.service;
          const suggestion = this.findMostSimilar(
            invalidValue,
            issue.options as string[],
          );

          if (suggestion) {
            return {
              message: `The service "${invalidValue}" you defined does not exist. Did you mean "${suggestion}"?`,
            };
          } else {
            return {
              message: `The service "${invalidValue}" you defined does not exist. Should be one of: ${issue.options.join(' | ')}`,
            };
          }
        }
        return { message: ctx.defaultError };
      },
    });
  }

  createDynamicSchema(): ReturnType<typeof MainConfigSchema.extend> {
    const serviceExecutionSchemas = this.createDiscriminatedServiceType(
      this.toolRegistry.getEntries().map((tool) => tool.options),
    );

    const toolConfigSchema = ToolConfigSchema.extend({
      execute: serviceExecutionSchemas,
    })

    return MainConfigSchema.extend({
      tools: z.array(toolConfigSchema).optional(),
    }).strict();
  }

  getSchema(): ZodType {
    if (!this.schema) {
      this.schema = this.createDynamicSchema();
    }
    return this.schema;
  }
}
