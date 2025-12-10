// import { BlockConfig } from '@loopstack/common';
// import { z } from 'zod';
// import { DocumentBase } from '@loopstack/core';
// import { Expose } from 'class-transformer';
//
// @BlockConfig({
//   properties: z.object({
//     date: z.string(),
//     summary: z.string(),
//     participants: z.array(z.string()),
//     decisions: z.array(z.string()),
//     actionItems: z.array(z.string()),
//   }),
//   configFile: __dirname + '/optimized-notes-document.yaml',
// })
// export class OptimizedNotesDocument extends DocumentBase {
//   @Expose()
//   date: string;
//
//   @Expose()
//   summary: string;
//
//   @Expose()
//   participants: string[];
//
//   @Expose()
//   decisions: string[];
//
//   @Expose()
//   actionItems: string[];
// }
