import axios from 'axios';
import { RegistryService } from '../registry.service';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('RegistryService', () => {
  let service: RegistryService;

  beforeEach(() => {
    service = new RegistryService();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getRegistryUrl', () => {
    it('should return the registry URL', () => {
      expect(service.getRegistryUrl()).toBe('https://loopstack.ai/r/registry.json');
    });
  });

  describe('findItem', () => {
    it('should return matching registry item', async () => {
      mockedAxios.get.mockResolvedValue({
        data: [
          { name: '@loopstack/oauth-module', description: 'OAuth module' },
          { name: '@loopstack/other', description: 'Other' },
        ],
      });

      const result = await service.findItem('@loopstack/oauth-module');

      expect(result).toEqual({ name: '@loopstack/oauth-module', description: 'OAuth module' });
    });

    it('should return null when item is not found', async () => {
      mockedAxios.get.mockResolvedValue({
        data: [{ name: '@loopstack/other' }],
      });

      const result = await service.findItem('@loopstack/missing');

      expect(result).toBeNull();
    });

    it('should match case-insensitively', async () => {
      mockedAxios.get.mockResolvedValue({
        data: [{ name: '@loopstack/OAuth-Module' }],
      });

      const result = await service.findItem('@loopstack/oauth-module');

      expect(result).toEqual({ name: '@loopstack/OAuth-Module' });
    });

    it('should throw when registry fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(service.findItem('@loopstack/test')).rejects.toThrow('Could not fetch registry');
    });
  });
});
