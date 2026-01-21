import { z, ZodType } from 'zod';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DynamicSchemaGeneratorService {
  private schema: ZodType;

  // Simple Levenshtein distance function
  // levenshteinDistance(str1: string, str2: string): number {
  //   const matrix = Array(str2.length + 1)
  //     .fill(null)
  //     .map(() => Array(str1.length + 1).fill(null));
  //
  //   for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  //   for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  //
  //   for (let j = 1; j <= str2.length; j++) {
  //     for (let i = 1; i <= str1.length; i++) {
  //       const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
  //       matrix[j][i] = Math.min(
  //         matrix[j][i - 1] + 1, // deletion
  //         matrix[j - 1][i] + 1, // insertion
  //         matrix[j - 1][i - 1] + indicator, // substitution
  //       );
  //     }
  //   }
  //
  //   return matrix[str2.length][str1.length];
  // }

  // Find the most similar option
  // findMostSimilar(input: string, options: string[]): string | null {
  //   let minDistance = Infinity;
  //   let mostSimilar = '';
  //
  //   for (const option of options) {
  //     const distance = this.levenshteinDistance(
  //       input.toLowerCase(),
  //       option.toLowerCase(),
  //     );
  //     if (distance < minDistance) {
  //       minDistance = distance;
  //       mostSimilar = option;
  //     }
  //   }
  //
  //   const maxLength = Math.max(input.length, mostSimilar.length);
  //   const similarity = (maxLength - minDistance) / maxLength;
  //   return similarity >= 0.7 ? mostSimilar : null;
  // }

  // createDiscriminatedHandlerType(
  //   items: Array<{
  //     options: HandlerOptionsInterface;
  //     instance: HandlerInterface;
  //   }>,
  // ) {
  //   const configSchemas = [];
  //   // items.map((item) =>
  //   //   HandlerCallSchema.extend({
  //   //     handler: z.literal(item.instance.constructor.name),
  //   //     arguments: item.options.config ?? z.any(),
  //   //   }),
  //   // );
  //
  //   return z.discriminatedUnion('handler', configSchemas as any, {
  //     errorMap: (issue, ctx) => {
  //       if (issue.code === 'invalid_union_discriminator') {
  //         const invalidValue = ctx.data.handler;
  //         const suggestion = invalidValue
  //           ? this.findMostSimilar(invalidValue, issue.options as string[])
  //           : undefined;
  //
  //         if (suggestion) {
  //           return {
  //             message: `The handler "${invalidValue}" you defined does not exist. Did you mean "${suggestion}"?`,
  //           };
  //         } else {
  //           return {
  //             message: `The handler "${invalidValue}" you defined does not exist. Should be one of: ${issue.options.join(' | ')}`,
  //           };
  //         }
  //       }
  //       return { message: ctx.defaultError };
  //     },
  //   });
  // }

  // createDynamicSchema(): ReturnType<typeof MainConfigSchema.extend> {
  //   return MainConfigSchema;
  //
  //   //todo
  //   // const handlerExecutionSchemas = this.createDiscriminatedHandlerType(
  //   //   this.handlerRegistry.getEntries(),
  //   // );
  //   // const toolConfigSchema = ToolConfigSchema.extend({
  //   //   execute: z.array(z.union([
  //   //     handlerExecutionSchemas,
  //   //     ToolCallSchema
  //   //   ])),
  //   // });
  //   // return MainConfigSchema.extend({
  //   //   tools: z.array(toolConfigSchema).optional(),
  //   // }).strict();
  // }

  getSchema(): ZodType {
    if (!this.schema) {
      this.schema = z.object({}); //this.createDynamicSchema();
    }
    return this.schema;
  }
}
