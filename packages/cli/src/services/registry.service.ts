import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface RegistryItem {
  name: string;
  description?: string;
}

@Injectable()
export class RegistryService {
  private readonly registryUrl = 'https://loopstack.ai/r/registry.json';

  getRegistryUrl(): string {
    return this.registryUrl;
  }

  async findItem(packageName: string): Promise<RegistryItem | null> {
    try {
      console.log('Loading registry...');
      const response = await axios.get<RegistryItem[]>(`${this.registryUrl}?package=${packageName}`);
      const registry = response.data;

      const item = registry.find((entry) => entry.name.toLowerCase() === packageName.toLowerCase());

      return item || null;
    } catch {
      console.error('Failed to load registry');
      console.log(`Registry URL: ${this.registryUrl}`);
      throw new Error('Could not fetch registry');
    }
  }
}
