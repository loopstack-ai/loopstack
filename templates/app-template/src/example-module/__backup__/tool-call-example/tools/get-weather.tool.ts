// import { BlockConfig, ToolResult } from '@loopstack/common';
// import { z } from 'zod';
// import { ToolBase } from '@loopstack/core';
// import { Injectable } from '@nestjs/common';
//
// const propertiesSchema = z.object({
//   location: z.string(),
// });
//
// const configSchema = z.object({
//   location: z.string(),
// });
//
// @Injectable()
// @BlockConfig({
//   config: {
//     description: 'Retrieve weather information.',
//   },
//   properties: propertiesSchema,
//   configSchema: configSchema,
// })
// export class GetWeather extends ToolBase {
//   async execute(): Promise<ToolResult> {
//
//     // Wait for 3 seconds for testing
//     await new Promise(resolve => setTimeout(resolve, 3000));
//
//     return {
//       type: 'text',
//       data: 'Mostly sunny, 14C, rain in the afternoon.'
//     };
//   }
// }
