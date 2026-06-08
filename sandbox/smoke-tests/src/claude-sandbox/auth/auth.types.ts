export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface LoginChallenge {
  authUrl: string;
  verifier: string;
  state: string;
}
