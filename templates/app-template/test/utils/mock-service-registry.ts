import { HandlerRegistry } from '@loopstack/core';
import { HandlerInterface } from '@loopstack/shared';

export interface MockServiceInterface extends HandlerInterface {
  apply: jest.MockedFunction<HandlerInterface['apply']>;
}

export function mockServiceInRegistry(
  serviceRegistry: HandlerRegistry,
  serviceName: string,
): MockServiceInterface {
  const mockInstance: MockServiceInterface = {
    apply: jest.fn(),
  };

  const existingService = serviceRegistry.getHandlerByName(serviceName);
  serviceRegistry['services'].set(serviceName, {
    options: existingService.options,
    instance: mockInstance,
  });

  return mockInstance;
}
