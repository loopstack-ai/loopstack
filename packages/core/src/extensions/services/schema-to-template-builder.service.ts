import { Injectable } from '@nestjs/common';
import { JSONSchemaConfigType } from '@loopstack/shared';

@Injectable()
export class SchemaToTemplateBuilderService {
  private schemaToMarkdown(
    schema: JSONSchemaConfigType,
    level: number,
    parentKey?: string,
  ): string {
    if (!schema) return '';

    const indent = '#'.repeat(level);
    let markdown = '';

    switch (schema.type) {
      case 'object': {
        const properties = schema.properties || {};
        for (const key of Object.keys(properties)) {
          markdown += `\n\n${indent} ${key}\n`;
          markdown += this.schemaToMarkdown(
            properties[key] as JSONSchemaConfigType,
            level + 1,
            key,
          );
        }
        break;
      }

      case 'array': {
        if (schema.items) {
          [1, 2].forEach((index: number) => {
            markdown += `\n\n${indent} item ${index}\n\n`;
            markdown += this.schemaToMarkdown(
              schema.items as JSONSchemaConfigType,
              level + 1,
            );
          });
          if (parentKey) {
            markdown += `\n\n... repeat for each ${parentKey.replace(/ies$/, 'y').replace(/s$/, '')}`;
          }
        }
        break;
      }

      case 'string': {
        markdown += `\n${schema.description}\n\n`;
        break;
      }

      default: {
        markdown += `\n${schema.description}\n\n`;
      }
    }

    return markdown.trim();
  }

  createTemplateFromSchema<T>(
    documentName: string,
    schema: JSONSchemaConfigType,
  ): string {
    const md = this.schemaToMarkdown(schema, 2);
    return `# ${documentName}\n\n${md}`;
  }
}
