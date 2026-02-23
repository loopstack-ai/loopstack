import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SignJWT, generateKeyPair } from 'jose';
import { createRemoteJWKSet } from 'jose';
import { UserTypeEnum } from '@loopstack/common';
import { User } from '@loopstack/common';
import { HubStrategy } from './hub.strategy';

// Mock createRemoteJWKSet — we'll replace the JWKS lookup with a local key
jest.mock('jose', () => {
  const actual = jest.requireActual('jose');
  return {
    ...actual,
    createRemoteJWKSet: jest.fn(),
  };
});

describe('HubStrategy', () => {
  let strategy: HubStrategy;
  let configGet: jest.Mock;
  let findById: jest.Mock;
  let findLocalUser: jest.Mock;
  let createUser: jest.Mock;

  // RSA key pair generated once for all tests
  let privateKey: CryptoKey;
  let publicKey: CryptoKey;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256', { extractable: true });
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;
  });

  beforeEach(() => {
    configGet = jest.fn();
    findById = jest.fn();
    findLocalUser = jest.fn();
    createUser = jest.fn();

    const configService = { get: configGet } as unknown as ConfigService;
    const userRepository = {
      findById,
      findLocalUser,
      create: createUser,
    };

    // Reset the cached JWKS on each test by creating a fresh strategy
    strategy = new HubStrategy(configService, userRepository as any);

    // Mock createRemoteJWKSet to return a function that uses our local public key
    (createRemoteJWKSet as jest.Mock).mockClear();
    (createRemoteJWKSet as jest.Mock).mockReturnValue(async () => new Promise((resolve) => resolve(publicKey)));
  });

  function mockRequest(body: Record<string, unknown>): Request {
    return { body } as unknown as Request;
  }

  function mockUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user-123',
      type: UserTypeEnum.Cloud,
      isActive: true,
      roles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as User;
  }

  async function signToken(claims: Record<string, unknown> = {}): Promise<string> {
    return new SignJWT({ scope: 'worker:connect', ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://hub.loopstack.ai')
      .setSubject('user-123')
      .setAudience('worker-456')
      .setIssuedAt()
      .setExpirationTime('60s')
      .sign(privateKey);
  }

  function setupCloudConfig() {
    configGet.mockImplementation((key: string) => {
      const config: Record<string, any> = {
        'app.isLocalMode': false,
        'auth.hub.jwksUri': 'https://hub.loopstack.ai/.well-known/jwks.json',
        'auth.hub.issuer': 'https://hub.loopstack.ai',
        'auth.clientId': 'worker-456',
      };
      return config[key];
    });
  }

  function setupLocalConfig() {
    configGet.mockImplementation((key: string) => {
      if (key === 'app.isLocalMode') return true;
      return undefined;
    });
  }

  describe('local mode', () => {
    beforeEach(() => {
      setupLocalConfig();
    });

    it('should return existing local user', async () => {
      const existing = mockUser({ type: UserTypeEnum.Local });
      findLocalUser.mockResolvedValue(existing);

      const result = await strategy.validate(mockRequest({}));

      expect(result).toBe(existing);
      expect(findLocalUser).toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
    });

    it('should create local user if none exists', async () => {
      const created = mockUser({ type: UserTypeEnum.Local });
      findLocalUser.mockResolvedValue(null);
      createUser.mockResolvedValue(created);

      const result = await strategy.validate(mockRequest({}));

      expect(result).toBe(created);
      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserTypeEnum.Local,
          isActive: true,
          roles: [],
        }),
      );
    });
  });

  describe('cloud mode', () => {
    beforeEach(() => {
      setupCloudConfig();
    });

    it('should verify ID token and return existing user', async () => {
      const token = await signToken();
      const existing = mockUser();
      findById.mockResolvedValue(existing);

      const result = await strategy.validate(mockRequest({ idToken: token }));

      expect(result).toBe(existing);
      expect(findById).toHaveBeenCalledWith('user-123');
      expect(createUser).not.toHaveBeenCalled();
    });

    it('should create new user when not found', async () => {
      const token = await signToken();
      const created = mockUser();
      findById.mockResolvedValue(null);
      createUser.mockResolvedValue(created);

      const result = await strategy.validate(mockRequest({ idToken: token }));

      expect(result).toBe(created);
      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          isActive: true,
          roles: [],
        }),
      );
    });

    it('should throw when idToken is missing', async () => {
      await expect(strategy.validate(mockRequest({}))).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(mockRequest({}))).rejects.toThrow('Missing ID token');
    });

    it('should throw when token has wrong issuer', async () => {
      const token = await new SignJWT({ scope: 'worker:connect' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer('https://evil.example.com')
        .setSubject('user-123')
        .setAudience('worker-456')
        .setIssuedAt()
        .setExpirationTime('60s')
        .sign(privateKey);

      await expect(strategy.validate(mockRequest({ idToken: token }))).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when token has wrong audience', async () => {
      const token = await new SignJWT({ scope: 'worker:connect' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer('https://hub.loopstack.ai')
        .setSubject('user-123')
        .setAudience('wrong-worker')
        .setIssuedAt()
        .setExpirationTime('60s')
        .sign(privateKey);

      await expect(strategy.validate(mockRequest({ idToken: token }))).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when token is expired', async () => {
      const token = await new SignJWT({ scope: 'worker:connect' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer('https://hub.loopstack.ai')
        .setSubject('user-123')
        .setAudience('worker-456')
        .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
        .sign(privateKey);

      await expect(strategy.validate(mockRequest({ idToken: token }))).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when JWKS URI is not configured', async () => {
      configGet.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'app.isLocalMode': false,
          'auth.hub.jwksUri': undefined,
          'auth.hub.issuer': 'https://hub.loopstack.ai',
          'auth.clientId': 'worker-456',
        };
        return config[key];
      });

      const token = await signToken();

      await expect(strategy.validate(mockRequest({ idToken: token }))).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(mockRequest({ idToken: token }))).rejects.toThrow('Hub JWKS URI not configured');
    });

    it('should throw when token signature is invalid', async () => {
      // Sign with a different key
      const { privateKey: otherKey } = await generateKeyPair('RS256', { extractable: true });
      const token = await new SignJWT({ scope: 'worker:connect' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer('https://hub.loopstack.ai')
        .setSubject('user-123')
        .setAudience('worker-456')
        .setIssuedAt()
        .setExpirationTime('60s')
        .sign(otherKey);

      await expect(strategy.validate(mockRequest({ idToken: token }))).rejects.toThrow(UnauthorizedException);
    });

    it('should cache the JWKS client across calls', async () => {
      const token1 = await signToken();
      const token2 = await signToken();
      findById.mockResolvedValue(mockUser());

      await strategy.validate(mockRequest({ idToken: token1 }));
      await strategy.validate(mockRequest({ idToken: token2 }));

      // createRemoteJWKSet should only be called once (cached)
      expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
    });
  });
});
