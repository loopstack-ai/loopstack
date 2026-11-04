import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mockServerUrl } from './mock-provider.config';

export interface MockProfile {
  id: string;
  name: string;
  email: string;
}

/** Calls the mock server's protected API with an access token, as an SDK client for a real service would. */
@Injectable()
export class MockApiClient {
  constructor(private readonly configService: ConfigService) {}

  /** Returns `undefined` when the API rejects the token, for example after the mock server restarted. */
  async getProfile(accessToken: string): Promise<MockProfile | undefined> {
    const response = await fetch(`${mockServerUrl(this.configService)}/api/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 401) return undefined;
    if (!response.ok) {
      throw new Error(`Mock API request failed: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as MockProfile;
  }
}
