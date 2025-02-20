import { NamedCollectionItem } from '../interfaces/named-collection-item.interface';
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class CollectionService<T extends NamedCollectionItem> {
  private items: Map<string, T> = new Map();

  set(items: T[]): void {
    this.items.clear();
    for (const item of items) {
      this.items.set(item.name, item);
    }
  }

  clear() {
    this.items.clear();
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

  has(name: string): boolean {
    return this.items.has(name);
  }

  getByName(name: string): T | undefined {
    return this.items.get(name);
  }

  merge(items: T[]): void {
    for (const item of items) {
      this.add(item);
    }
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }
}
