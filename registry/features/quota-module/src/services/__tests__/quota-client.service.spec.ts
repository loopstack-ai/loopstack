import { QuotaClientService } from '../quota-client.service';

describe('QuotaClientService', () => {
  describe('without Redis (null)', () => {
    let service: QuotaClientService;

    beforeEach(() => {
      service = new QuotaClientService(null);
    });

    it('checkQuota should return not exceeded with unlimited', async () => {
      const result = await service.checkQuota('user-1', 'default-token');
      expect(result).toEqual({ exceeded: false, used: 0, limit: -1 });
    });

    it('report should complete without error', async () => {
      await expect(service.report('user-1', 'default-token', 100)).resolves.toBeUndefined();
    });
  });

  describe('with Redis mock', () => {
    let service: QuotaClientService;
    let redisMock: Record<string, jest.Mock>;

    beforeEach(() => {
      redisMock = {
        get: jest.fn(),
        incrby: jest.fn(),
      };
      service = new QuotaClientService(redisMock as any);
    });

    describe('checkQuota', () => {
      it('should return not exceeded when under limit', async () => {
        redisMock.get.mockResolvedValueOnce('50').mockResolvedValueOnce('1000');

        const result = await service.checkQuota('user-1', 'default-token');
        expect(result).toEqual({ exceeded: false, used: 50, limit: 1000 });
      });

      it('should return exceeded when at limit', async () => {
        redisMock.get.mockResolvedValueOnce('1000').mockResolvedValueOnce('1000');

        const result = await service.checkQuota('user-1', 'default-token');
        expect(result).toEqual({ exceeded: true, used: 1000, limit: 1000 });
      });

      it('should return exceeded when over limit', async () => {
        redisMock.get.mockResolvedValueOnce('1500').mockResolvedValueOnce('1000');

        const result = await service.checkQuota('user-1', 'default-token');
        expect(result).toEqual({ exceeded: true, used: 1500, limit: 1000 });
      });

      it('should block when no limit key exists (no quota assigned)', async () => {
        redisMock.get.mockResolvedValueOnce('500').mockResolvedValueOnce(null);

        const result = await service.checkQuota('user-1', 'default-token');
        expect(result).toEqual({ exceeded: true, used: 500, limit: 0 });
      });

      it('should treat missing used as 0', async () => {
        redisMock.get.mockResolvedValueOnce(null).mockResolvedValueOnce('1000');

        const result = await service.checkQuota('user-1', 'default-token');
        expect(result).toEqual({ exceeded: false, used: 0, limit: 1000 });
      });

      it('should treat explicit limit of -1 as unlimited', async () => {
        redisMock.get.mockResolvedValueOnce('999999').mockResolvedValueOnce('-1');

        const result = await service.checkQuota('user-1', 'default-token');
        expect(result).toEqual({ exceeded: false, used: 999999, limit: -1 });
      });

      it('should block when no limit key and no usage exist', async () => {
        redisMock.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

        const result = await service.checkQuota('user-1', 'default-token');
        expect(result).toEqual({ exceeded: true, used: 0, limit: 0 });
      });

      it('should fail-open on Redis error', async () => {
        redisMock.get.mockRejectedValue(new Error('Connection refused'));

        const result = await service.checkQuota('user-1', 'default-token');
        expect(result).toEqual({ exceeded: false, used: 0, limit: -1 });
      });
    });

    describe('report', () => {
      it('should increment the used key', async () => {
        redisMock.incrby.mockResolvedValue(150);

        await service.report('user-1', 'default-token', 150);

        expect(redisMock.incrby).toHaveBeenCalledWith('user:user-1:quota:default-token:used', 150);
      });

      it('should not throw on Redis error', async () => {
        redisMock.incrby.mockRejectedValue(new Error('Connection refused'));

        await expect(service.report('user-1', 'default-token', 100)).resolves.toBeUndefined();
      });
    });
  });
});
