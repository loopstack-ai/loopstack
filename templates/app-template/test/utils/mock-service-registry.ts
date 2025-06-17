import { ServiceRegistry } from '@loopstack/core';
import { ServiceInterface } from '@loopstack/shared';

export interface MockServiceInterface extends ServiceInterface {
  apply: jest.MockedFunction<ServiceInterface['apply']>;
}

export function mockServiceInRegistry(
  serviceRegistry: ServiceRegistry,
  serviceName: string,
): MockServiceInterface {
  const mockInstance: MockServiceInterface = {
    apply: jest.fn(),
  };

  const existingService = serviceRegistry.getServiceByName(serviceName);
  serviceRegistry['services'].set(serviceName, {
    options: existingService.options,
    instance: mockInstance,
  });

  return mockInstance;
}
