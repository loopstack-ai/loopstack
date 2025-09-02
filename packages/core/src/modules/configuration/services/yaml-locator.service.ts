import { Injectable } from '@nestjs/common';
import { parseDocument, isMap, isSeq, Node } from 'yaml';

export interface YamlLocation {
  start: { line: number; col: number; offset: number };
  end: { line: number; col: number; offset: number };
}

@Injectable()
export class YamlLocatorService {
  private offsetToLineCol(src: string, offset: number) {
    const before = src.slice(0, offset);
    const line = before.split('\n').length;
    const col = offset - before.lastIndexOf('\n');
    return { line, col, offset };
  }

  private getNodeAtPath(
    node: Node | null | undefined,
    path: (string | number)[]
  ): Node | undefined {
    if (!node) return undefined;
    if (path.length === 0) return node;

    const [head, ...rest] = path;

    if (isMap(node)) {
      const child = node.get(head as string, true) as Node | undefined;
      return this.getNodeAtPath(child, rest);
    }

    if (isSeq(node)) {
      const idx =
        typeof head === 'number' ? head : parseInt(String(head), 10);
      const child = node.items[idx] as Node | undefined;
      return this.getNodeAtPath(child, rest);
    }

    return undefined;
  }

  getYamlLocation(
    src: string,
    path: (string | number)[]
  ): YamlLocation | undefined {
    const doc = parseDocument(src);
    const node = this.getNodeAtPath(doc.contents as Node, path);
    if (!node || !node.range) return undefined;

    const [start, end] = node.range;
    return {
      start: this.offsetToLineCol(src, start),
      end: this.offsetToLineCol(src, end),
    };
  }
}
