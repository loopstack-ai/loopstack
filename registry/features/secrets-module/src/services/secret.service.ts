import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecretEntity } from '../entities/index.js';
import { SECRETS_MODULE_CONFIG, type SecretsModuleConfig } from '../secrets.constants.js';

/** One resolved key available to a workspace, with whether it holds a value and whether it's a global fallback. */
export interface ResolvedSecretKey {
  key: string;
  hasValue: boolean;
  /** True when the key resolves from the global (`process.env`) fallback rather than a workspace secret. */
  global: boolean;
}

/**
 * Service that performs workspace-scoped CRUD on secrets — find, create, update, upsert, and delete;
 * inject it to read or write secret values programmatically from backend code. It also resolves the
 * effective env for a workspace, overlaying the module's configured global fallback keys (from
 * `process.env`) with the workspace's own secrets — see {@link SecretsModuleConfig}.
 *
 * @providedBy SecretsModule
 * @public
 */
@Injectable()
export class SecretService {
  constructor(
    @InjectRepository(SecretEntity)
    private secretRepository: Repository<SecretEntity>,
    @Inject(SECRETS_MODULE_CONFIG)
    private readonly config: SecretsModuleConfig,
  ) {}

  async findAllByWorkspace(workspaceId: string): Promise<SecretEntity[]> {
    return this.secretRepository.find({
      where: { workspaceId },
      order: { key: 'ASC' },
    });
  }

  /**
   * The effective `key → value` env for a workspace: the configured global fallback keys resolved from
   * `process.env` first, then overlaid by the workspace's own secrets (so a workspace secret of the same
   * key always wins). Only keys in `config.globalSecretKeys` are eligible for the global fallback.
   */
  async resolveEnvMap(workspaceId: string): Promise<Record<string, string>> {
    const merged: Record<string, string> = {};
    for (const key of this.config.globalSecretKeys ?? []) {
      const value = process.env[key];
      if (value) merged[key] = value;
    }
    for (const secret of await this.findAllByWorkspace(workspaceId)) merged[secret.key] = secret.value;
    return merged;
  }

  /**
   * The keys available to a workspace — its own secrets plus any global fallback keys that resolve from
   * `process.env` and the workspace hasn't overridden — each flagged with its source. Never returns values.
   */
  async resolveKeys(workspaceId: string): Promise<ResolvedSecretKey[]> {
    const own = await this.findAllByWorkspace(workspaceId);
    const ownKeys = new Set(own.map((s) => s.key));
    const result: ResolvedSecretKey[] = own.map((s) => ({ key: s.key, hasValue: !!s.value, global: false }));
    for (const key of this.config.globalSecretKeys ?? []) {
      if (ownKeys.has(key)) continue;
      if (process.env[key]) result.push({ key, hasValue: true, global: true });
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  async create(workspaceId: string, data: { key: string; value: string }): Promise<SecretEntity> {
    const secret = this.secretRepository.create({
      workspaceId,
      key: data.key,
      value: data.value,
    });
    return this.secretRepository.save(secret);
  }

  async update(id: string, workspaceId: string, data: { value?: string }): Promise<SecretEntity> {
    const secret = await this.secretRepository.findOne({
      where: { id, workspaceId },
    });

    if (!secret) {
      throw new NotFoundException(`Secret with ID ${id} not found`);
    }

    if (data.value !== undefined) secret.value = data.value;

    return this.secretRepository.save(secret);
  }

  async upsert(workspaceId: string, data: { key: string; value: string }): Promise<SecretEntity> {
    const existing = await this.secretRepository.findOne({
      where: { workspaceId, key: data.key },
    });

    if (existing) {
      existing.value = data.value;
      return this.secretRepository.save(existing);
    }

    return this.create(workspaceId, data);
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    const secret = await this.secretRepository.findOne({
      where: { id, workspaceId },
    });

    if (!secret) {
      throw new NotFoundException(`Secret with ID ${id} not found`);
    }

    await this.secretRepository.remove(secret);
  }
}
