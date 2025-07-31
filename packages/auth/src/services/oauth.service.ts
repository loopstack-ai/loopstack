import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { UserRepository } from '../repositories';
import { AuthResponseDto, LinkProviderDto, OAuthProfileInterface, UserResponseDto } from '@loopstack/shared';
import { AuthProviderRepository } from '../repositories/auth-provider.repository';

@Injectable()
export class OAuthService {
  constructor(
    private userRepository: UserRepository,
    private authProviderRepository: AuthProviderRepository,
    private tokenService: TokenService,
    private authService: AuthService,
  ) {}

  async handleOAuthLogin(profile: OAuthProfileInterface): Promise<AuthResponseDto> {
    // Check if provider already linked
    let authProvider = await this.authProviderRepository.findByProviderAndId(
      profile.provider,
      profile.id,
    );

    let user;

    if (authProvider) {
      // Existing user with this provider
      user = authProvider.user;
    } else {
      // Check if user exists with same email
      user = await this.userRepository.findByEmail(profile.email);

      if (!user) {
        // Create new user
        user = await this.userRepository.create({
          email: profile.email,
          firstName: profile.firstName || profile.displayName?.split(' ')[0] || '',
          lastName: profile.lastName || profile.displayName?.split(' ').slice(1).join(' ') || '',
          isActive: true,
        });
      }

      // Link provider to user
      await this.authProviderRepository.create({
        provider: profile.provider,
        providerId: profile.id,
        user: user,
        profile: profile._json,
      });
    }

    const tokens = await this.tokenService.generateTokens(user);
    return {
      ...tokens,
      tokenType: 'Bearer',
    };
  }

  async linkProvider(userId: string, linkProviderDto: LinkProviderDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if provider already linked to another account
    const existingProvider = await this.authProviderRepository.findByProviderAndId(
      linkProviderDto.provider,
      linkProviderDto.code, // This should be the provider ID after OAuth flow
    );

    if (existingProvider) {
      throw new ConflictException('This provider is already linked to another account');
    }

    // Link provider to current user
    await this.authProviderRepository.create({
      provider: linkProviderDto.provider,
      providerId: linkProviderDto.code,
      user: user,
    });

    const updatedUser = await this.userRepository.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return this.authService.mapUserToResponse(updatedUser);
  }

  async getUserProviders(userId: string): Promise<string[]> {
    const providers = await this.authProviderRepository.findByUserId(userId);
    return providers.map(p => p.provider);
  }
}
