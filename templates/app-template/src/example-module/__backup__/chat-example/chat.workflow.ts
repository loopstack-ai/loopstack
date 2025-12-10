// import { CreateDocument, WorkflowBase } from '@loopstack/core';
// import { BlockConfig, Input } from '@loopstack/common';
// import { AiGenerateText } from '@loopstack/llm';
// import { Expose } from 'class-transformer';
//
// @BlockConfig({
//   imports: [
//     CreateDocument,
//     AiGenerateText
//   ],
//   configFile: __dirname + '/chat.workflow.yaml',
// })
// export class ChatWorkflow extends WorkflowBase  {
//   @Input()
//   @Expose()
//   llmResponse: any;
// }