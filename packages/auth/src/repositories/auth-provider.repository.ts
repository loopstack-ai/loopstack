import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthProvider } from '@loopstack/shared';

@Injectable()
export class AuthProviderRepository {
  constructor(
    @InjectRepository(AuthProvider)
    private repository: Repository<AuthProvider>,
  ) {}

  async findByProviderAndId(provider: string, providerId: string): Promise<AuthProvider | null> {
    return this.repository.findOne({
      where: { provider, providerId },
      relations: ['user', 'user.roles'],
    });
  }

  async findByUserId(userId: string): Promise<AuthProvider[]> {
    return this.repository.find({
      where: { user: { id: userId } },
    });
  }

  async create(providerData: Partial<AuthProvider>): Promise<AuthProvider> {
    const provider = this.repository.create(providerData);
    return this.repository.save(provider);
  }
}