import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@loopstack/common';
import { UserRepository } from '../repositories';

@Injectable()
export class LocalDevUserSeeder implements OnModuleInit {
  private readonly LOCAL_DEV_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {}

  async onModuleInit() {
    const isLocalMode = this.configService.get<boolean>('app.isLocalMode');
    if (!isLocalMode) return;

    // Check if local dev user exists
    const existingUser = await this.userRepository.findById(this.LOCAL_DEV_USER_ID);

    if (!existingUser) {
      await this.userRepository.create({
        id: this.LOCAL_DEV_USER_ID,
        isActive: true,
        roles: [],
      } satisfies Partial<User>);

      console.log('✓ Local dev user created');
    }
  }

  getLocalDevUserId(): string {
    return this.LOCAL_DEV_USER_ID;
  }
}
