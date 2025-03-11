import { Injectable } from '@nestjs/common';
import { set, get } from 'lodash';
import { JSONSchemaConfigType } from '@loopstack/shared';
import * as unifiedModule from 'unified';
import * as remarkParseModule from 'remark-parse';
import Ajv from 'ajv';

@Injectable()
export class MarkdownParserService {
  getValue(node: any): string {
    if (
      [
        'paragraph',
        'strong',
        'heading',
        'list',
        'listItem',
        'emphasis',
      ].includes(node.type)
    ) {
      return node['children']
        .map((child) => this.getValue(child))
        .join(' ')
        .trim();
    }

    if (['code', 'text', 'inlineCode'].includes(node.type)) {
      return node['value'].trim();
    }

    throw 'Unexpected content type: ' + node.type;
  }

  traverseAndExtract(extracted, isArray) {
    const newObject = {};
    const keys = Object.keys(extracted);

    for (const key of keys) {
      if (isArray.includes(key)) {
        newObject[key] = Object.values(extracted[key]).map((value) => {
          return this.traverseAndExtract(value, isArray);
        });
      } else if (
        typeof extracted[key] === 'object' &&
        !Array.isArray(extracted[key])
      ) {
        newObject[key] = this.traverseAndExtract(extracted[key], isArray);
      } else {
        newObject[key] =
          typeof extracted[key] === 'string'
            ? extracted[key].trim()
            : extracted[key];
      }
    }

    return newObject; // Return the new object with updated properties
  }

  extractObject(
    node: Node,
    rootSchema: JSONSchemaConfigType,
    currentKey: string[] = [],
    currentSchema: any[] = [],
    currentDepth: number[] = [],
    isArray: string[] = [],
  ): any {
    const extracted = {};

    if (node['children']) {
      if (node['children'][0].type !== 'heading') {
        throw 'should start with a heading';
      }

      for (const child of node['children']) {
        let key = currentKey[currentKey.length - 1];
        let schema = currentSchema[currentSchema.length - 1] ?? rootSchema;
        let depth = currentDepth[currentDepth.length - 1] ?? 0;

        // console.log({
        //   key,
        //   depth,
        //   schema,
        //   childDepth: child.depth ?? 'NA',
        //   type: child.type,
        //   value: this.getValue(child),
        // });
        if (child.type === 'heading') {
          if (child.depth <= depth) {
            while (child.depth <= depth) {
              // console.log('child is lower or equal depth');
              currentKey.pop();
              currentSchema.pop();
              currentDepth.pop();
              key = currentKey[currentKey.length - 1];
              depth = currentDepth[currentDepth.length - 1];
              schema = currentSchema[currentSchema.length - 1];
            }
          }

          const newKey = child.children?.[0].value.trim();
          const propSchema = schema.properties?.[newKey];

          console.log('newKey', newKey, propSchema, schema);
          if (propSchema) {
            currentKey.push(newKey);
            currentSchema.push(propSchema);
            currentDepth.push(child.depth);
            continue;
          }

          if (schema.type === 'array') {
            const itemSchema = schema.items;
            if (itemSchema && itemSchema.type === 'object') {
              isArray.push(key);
              currentKey.push(newKey);
              currentSchema.push(itemSchema);
              currentDepth.push(child.depth);
              continue;
            } else {
              const current = get(extracted, currentKey) ?? [];
              current.push(this.getValue(child));
              // console.log('current', current);
              set(extracted, currentKey, current);
              continue;
            }
          }
        }

        if (schema.type === 'array') {
          switch (child.type) {
            case 'paragraph':
            case 'code':
              const current = get(extracted, currentKey) ?? [];
              current[current.length - 1] =
                current[current.length - 1] + '\n' + this.getValue(child);
              set(extracted, currentKey, current);
              continue;
            case 'list':
              set(
                extracted,
                currentKey,
                child.children?.map((listItem: Node) => {
                  const combined: string[] = [];
                  for (const child2 of listItem['children']) {
                    combined.push(this.getValue(child2));
                  }

                  return combined.join('\n').trim();
                }) ?? [],
              );
              continue;
            default:
              break;
          }
        } else {
          switch (child.type) {
            case 'list':
              let currentL = get(extracted, currentKey) ?? '';
              currentL += (
                child.children?.map((listItem: Node) => {
                  const combined: string[] = [];
                  for (const child2 of listItem['children']) {
                    combined.push(this.getValue(child2));
                  }

                  return combined.join('\n').trim();
                }) ?? []
              ).join('\n');
              set(extracted, currentKey, currentL);
              continue;
            default:
              let current = get(extracted, currentKey) ?? '';
              current += this.getValue(child) + '\n';
              set(extracted, currentKey, current);
              continue;
          }
        }

        throw new Error(
          `Unexpected content type for section "${key}" in Markdown: ${schema.type}, ${child.type}`,
        );
      }
    }

    return this.traverseAndExtract(extracted, isArray);
  }

  public validate(obj: any, schema: JSONSchemaConfigType) {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    if (!validate(obj)) {
      console.log(obj);
      console.log(validate.errors);
      throw new Error(`Result validation failed.`);
    }
  }

  public parse(
    markdownContent: string,
    rootKey: string | undefined,
    schema: JSONSchemaConfigType,
  ): any {
    const unified = unifiedModule.unified as any;
    const remarkParse = remarkParseModule.default as any;

    const ast = unified()
      .use(remarkParse)
      .parse(markdownContent) as Node;

    const obj = this.extractObject(
      ast,
      schema,
      rootKey ? [rootKey] : [],
      rootKey ? [schema] : [],
      rootKey ? [0] : [],
    );

    this.validate(obj, schema);

    return obj;
  }
}
