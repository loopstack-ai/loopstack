import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../../processor/decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor/interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../../processor/interfaces/transition-result.interface';
import { TransitionManagerService } from '../services/transition-manager.service';
import { DocumentCreateDto } from '../../persistence/dtos';
import { FunctionCallService } from '../../processor/services/function-call.service';
import { z } from 'zod';
import { JSONSchemaType } from '../../configuration/schemas/json-schema.schema';
import { FormUISchema } from '../../configuration/schemas/form-ui.schema';
const crypto = require('crypto');

export const FormRequestDocumentContentsSchema = z.object({
  callback: z.object({
    transition: z.string(),
  }),
  schema: JSONSchemaType.optional(),
  uiSchema: FormUISchema.optional(),
});

const CreateFormSchema = z.object({
  name: z.string().optional(),
  type: z.literal("form"),
  contents: FormRequestDocumentContentsSchema,
  meta: z.any().optional(),
});

const CreateFormResponseSchema = z.object({
  name: z.string().optional(),
  type: z.literal("form-response"),
  contents: z.string().optional(), // this is a function call string
  meta: z.any().optional(),
});

const CreateDocumentSchema = z.object({
  name: z.string().optional(),
  type: z.literal("document"),
  contents: z.string(),
  meta: z.any().optional(),
});

export const MessageDocumentContentsSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  message: z.string(),
});

const CreateMessageSchema = z.object({
  name: z.string().optional(),
  type: z.literal("message"),
  contents: MessageDocumentContentsSchema,
  meta: z.any().optional(),
});

export type DocumentFormType = z.infer<typeof CreateFormSchema>;
export type DocumentMessageType = z.infer<typeof CreateMessageSchema>;
export type FormResponseType = z.infer<typeof CreateFormResponseSchema>;

export const CreateDocumentPropsSchema = z.discriminatedUnion("type", [
  CreateFormSchema,
  CreateDocumentSchema,
  CreateMessageSchema,
  CreateFormResponseSchema,
]);

export type CreateDocumentPropsConfigType = z.infer<typeof CreateDocumentPropsSchema>;

@Injectable()
@StateMachineAction()
export class CreateDocumentAction implements StateMachineActionInterface {

  propsSchema = CreateDocumentPropsSchema;

  constructor(
    private transitionManagerService: TransitionManagerService,
    private functionCallService: FunctionCallService,
  ) {}

  generateUUID() {
    return crypto.randomUUID();
  }

  async execute(
    context: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(context);

    const props: CreateDocumentPropsConfigType =
      CreateDocumentPropsSchema.parse(context.props);

    const contents = this.functionCallService.runEval(props.contents, {
      context
    });

    manager.createDocument(
      new DocumentCreateDto({
        name: props.name ?? this.generateUUID(),
        type: props.type,
        contents: contents,
        meta: {
          ...(props.meta ?? {}),
        },
      }),
    );

    return manager.getResult();
  }
}
