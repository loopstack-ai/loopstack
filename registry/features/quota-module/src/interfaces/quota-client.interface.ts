export type QuotaCheckResult = {
  exceeded: boolean;
  used: number;
  limit: number;
};

export const QUOTA_CLIENT_SERVICE = 'QUOTA_CLIENT_SERVICE';

export interface QuotaClientServiceInterface {
  checkQuota(userId: string, quotaType: string): Promise<QuotaCheckResult>;
  report(userId: string, quotaType: string, amount: number): Promise<void>;
}
