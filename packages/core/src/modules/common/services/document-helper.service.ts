import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  DocumentSchema,
  DocumentType,
  PartialDocumentSchema,
} from '@loopstack/shared';
import { merge } from 'lodash';
import { ValueParserService } from './value-parser.service';

export const CreateDocumentWithSchema = z.object({
  update: PartialDocumentSchema?.optional(),
  create: DocumentSchema?.optional(),
});

@Injectable()
export class DocumentHelperService {
  constructor(
    private valueParserService: ValueParserService,
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

  prepareAliasVariables(aliasReference: Record<string, any>, dataSource: Record<string, any>): Record<string, any> {
    return this.valueParserService.prepareAliasVariables(aliasReference, dataSource);
  }

  createDocumentWithSchema(
    options: z.infer<typeof CreateDocumentWithSchema>,
    template: any,
    context: any,
  ): DocumentType {
    const prototype = this.prepare(options, template);
    const document = this.valueParserService.evalObjectLeafs(prototype, context);
    return document as DocumentType;
  }
}
