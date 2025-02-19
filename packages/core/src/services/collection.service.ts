import { NamedCollectionItem } from '../interfaces/named-collection-item.interface';
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class CollectionService<T extends NamedCollectionItem> {
  private items: Map<string, T> = new Map();

  protected set(items: T[]): void {
    this.items.clear();
    for (const item of items) {
      this.items.set(item.name, item);
    }
  }

  add(item: T): void {
    if (this.items.has(item.name)) {
      throw new Error(`item with name "${item.name}" already exists.`);
    }
    this.items.set(item.name, item);
  }

  removeByName(name: string): void {
    if (!this.items.has(name)) {
      throw new Error(`item with name "${name}" not found.`);
    }
    this.items.delete(name);
  }

  getByName(name: string): T | undefined {
    return this.items.get(name);
  }

  merge(items: T[]): void {
    for (const item of items) {
      if (this.items.has(item.name)) {
        throw new Error(`item with name "${item.name}" already exists.`);
      }
      this.items.set(item.name, item);
    }
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }
}
