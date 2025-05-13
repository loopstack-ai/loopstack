import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  DocumentSchema,
  DocumentType,
  PartialDocumentSchema,
} from '@loopstack/shared';
import { FunctionCallService } from './function-call.service';
import { TemplateEngineService } from './template-engine.service';
import { merge, omit } from 'lodash';

export const CreateDocumentWithSchema = z.object({
  template: z.string().optional(),
  update: PartialDocumentSchema?.optional(),
  create: DocumentSchema?.optional(),
});

@Injectable()
export class DocumentHelperService {
  constructor(
    private functionCallService: FunctionCallService,
    private templateEngineService: TemplateEngineService,
  ) {}

  prepare(options: z.infer<typeof CreateDocumentWithSchema>, template: any) {
    if (options.create) {
      return options.create;
    }

    if (template) {
      if (options.update) {
        return merge({}, template, options.update);
      }
      return template;
    }

    throw new Error(
      `Create document requires template or create property to be defined.`,
    );
  }

  evalObjectLeafs<T>(obj: T, variables: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      const result = this.functionCallService.runEval(obj, variables);
      return this.templateEngineService.parseValue(
        result,
        variables,
      ) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.evalObjectLeafs(item, variables),
      ) as unknown as T;
    }

    const result = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.evalObjectLeafs(obj[key], variables);
      }
    }

    return result;
  }

  createDocumentWithSchema(
    options: z.infer<typeof CreateDocumentWithSchema>,
    template: any,
    context: any,
  ): DocumentType {
    const prototype = this.prepare(options, template);

    // do not re-evaluate the content since it could include ejs syntax as output
    const excludingContent = omit(prototype, ['content']);
    const document = this.evalObjectLeafs(excludingContent, context);
    document.content = prototype.content ?? null;

    return document as DocumentType;
  }
}
