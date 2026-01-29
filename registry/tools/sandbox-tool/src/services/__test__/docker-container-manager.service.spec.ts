/*
Copyright 2025 The Loopstack Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { Test, TestingModule } from '@nestjs/testing';
import { PassThrough } from 'stream';
import { ContainerConfig, DOCKER_CLIENT, DockerContainerManagerService } from '../docker-container-manager.service';

describe('DockerContainerManagerService', () => {
  let service: DockerContainerManagerService;
  let mockDocker: any;
  let mockContainer: any;
  let mockExec: any;
  let module: TestingModule;

  const testConfig: ContainerConfig = {
    imageName: 'test-image:latest',
    containerName: 'test-container',
    projectOutPath: '/host/path',
    rootPath: 'workspace',
  };

  beforeEach(async () => {
    mockExec = {
      start: jest.fn(),
      inspect: jest.fn(),
    };

    mockContainer = {
      id: 'docker-container-id-123',
      inspect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      remove: jest.fn(),
      exec: jest.fn().mockResolvedValue(mockExec),
    };

    mockDocker = {
      listContainers: jest.fn().mockResolvedValue([]),
      createContainer: jest.fn().mockResolvedValue(mockContainer),
      getContainer: jest.fn().mockReturnValue(mockContainer),
      getImage: jest.fn().mockReturnValue({
        inspect: jest.fn().mockResolvedValue({}),
      }),
      pull: jest.fn(),
      modem: {
        demuxStream: jest.fn(),
        followProgress: jest.fn(),
      },
    };

    module = await Test.createTestingModule({
      providers: [
        DockerContainerManagerService,
        {
          provide: DOCKER_CLIENT,
          useValue: mockDocker,
        },
      ],
    }).compile();

    service = module.get<DockerContainerManagerService>(DockerContainerManagerService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('registerContainer', () => {
    it('should register a container config', () => {
      service.registerContainer('test-id', testConfig);

      const ids = service.getRegisteredContainerIds();
      expect(ids).toContain('test-id');
    });

    it('should allow registering multiple containers', () => {
      service.registerContainer('test-id-1', testConfig);
      service.registerContainer('test-id-2', {
        ...testConfig,
        containerName: 'test-container-2',
      });

      const ids = service.getRegisteredContainerIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('test-id-1');
      expect(ids).toContain('test-id-2');
    });
  });

  describe('unregisterContainer', () => {
    it('should unregister a container config', () => {
      service.registerContainer('test-id', testConfig);
      service.unregisterContainer('test-id');

      const ids = service.getRegisteredContainerIds();
      expect(ids).not.toContain('test-id');
    });

    it('should not throw when unregistering non-existent container', () => {
      expect(() => service.unregisterContainer('non-existent')).not.toThrow();
    });
  });

  describe('getRegisteredContainerIds', () => {
    it('should return empty array when no containers registered', () => {
      const ids = service.getRegisteredContainerIds();
      expect(ids).toEqual([]);
    });
  });

  describe('ensureContainer', () => {
    it('should throw error if container not registered', async () => {
      await expect(service.ensureContainer('unregistered')).rejects.toThrow(
        "Container 'unregistered' not registered. Call registerContainer() first.",
      );
    });

    it('should create a new container when none exists', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      mockContainer.start.mockResolvedValue({});

      const container = await service.ensureContainer('test-id');

      expect(container).toBe(mockContainer);
      expect(mockDocker.createContainer).toHaveBeenCalledWith({
        Image: testConfig.imageName,
        name: testConfig.containerName,
        Cmd: ['sleep', 'infinity'],
        Tty: false,
        HostConfig: {
          Binds: [`${testConfig.projectOutPath}:/${testConfig.rootPath}`],
        },
      });
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it('should reuse existing running container from cache', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      mockContainer.start.mockResolvedValue({});

      // First call creates the container
      await service.ensureContainer('test-id');
      // Second call should reuse it
      const container = await service.ensureContainer('test-id');

      expect(container).toBe(mockContainer);
      // createContainer should only be called once
      expect(mockDocker.createContainer).toHaveBeenCalledTimes(1);
    });

    it('should start stopped container from cache', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.start.mockResolvedValue({});

      // First call: container running - createContainer calls start once
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      await service.ensureContainer('test-id');

      // Reset start call count after initial container creation
      mockContainer.start.mockClear();

      // Second call: container stopped in cache check, should start it
      mockContainer.inspect.mockResolvedValueOnce({
        State: { Running: false },
      });
      await service.ensureContainer('test-id');

      expect(mockContainer.start).toHaveBeenCalledTimes(1);
    });

    it('should find and reuse existing container by name', async () => {
      service.registerContainer('test-id', testConfig);
      mockDocker.listContainers.mockResolvedValue([{ Id: 'existing-id', Names: ['/test-container'] }]);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      const container = await service.ensureContainer('test-id');

      expect(container).toBe(mockContainer);
      expect(mockDocker.getContainer).toHaveBeenCalledWith('existing-id');
      expect(mockDocker.createContainer).not.toHaveBeenCalled();
    });

    it('should pull image if not available locally', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      const imageInspect = jest.fn().mockRejectedValue(new Error('Not found'));
      mockDocker.getImage.mockReturnValue({ inspect: imageInspect });

      // Mock pull to call the callback successfully
      mockDocker.pull.mockImplementation(
        (_imageName: string, callback: (err: Error | null, stream: NodeJS.ReadableStream) => void) => {
          const stream = new PassThrough();
          callback(null, stream);
          stream.end();
        },
      );

      mockDocker.modem.followProgress.mockImplementation(
        (_stream: NodeJS.ReadableStream, callback: (err: Error | null) => void) => {
          callback(null);
        },
      );

      await service.ensureContainer('test-id');

      expect(mockDocker.pull).toHaveBeenCalledWith(testConfig.imageName, expect.any(Function));
    });

    it('should serialize concurrent ensureContainer calls for same containerId', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      const calls: number[] = [];
      mockDocker.createContainer.mockImplementation(async () => {
        calls.push(Date.now());
        await new Promise((r) => setTimeout(r, 10));
        return mockContainer;
      });

      // Make concurrent calls
      const [c1, c2] = await Promise.all([service.ensureContainer('test-id'), service.ensureContainer('test-id')]);

      expect(c1).toBe(mockContainer);
      expect(c2).toBe(mockContainer);
      // Container should only be created once due to serialization
      expect(mockDocker.createContainer).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeCommand', () => {
    beforeEach(() => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
    });

    it('should execute a simple command', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockExec.inspect.mockResolvedValue({ ExitCode: 0 });

      // Simulate demuxStream populating stdout
      mockDocker.modem.demuxStream.mockImplementation(
        (_stream: NodeJS.ReadableStream, stdout: PassThrough, _stderr: PassThrough) => {
          stdout.write('command output');
        },
      );

      // Create container first
      await service.ensureContainer('test-id');

      const resultPromise = service.executeCommand({
        containerId: 'test-id',
        executable: 'echo',
        args: ['hello'],
      });

      // Emit end after a short delay
      setTimeout(() => mockStream.emit('end'), 10);

      const result = await resultPromise;

      expect(result.stdout).toBe('command output');
      expect(result.exitCode).toBe(0);
      expect(result.timedOut).toBe(false);
      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['sh', '-c', "cd '/' && 'echo' 'hello'"],
        AttachStdout: true,
        AttachStderr: true,
        Env: undefined,
      });
    });

    it('should execute command with custom working directory', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockExec.inspect.mockResolvedValue({ ExitCode: 0 });
      mockDocker.modem.demuxStream.mockImplementation(() => {});

      await service.ensureContainer('test-id');

      const resultPromise = service.executeCommand({
        containerId: 'test-id',
        executable: 'ls',
        workingDirectory: '/workspace/src',
      });

      setTimeout(() => mockStream.emit('end'), 10);
      await resultPromise;

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Cmd: ['sh', '-c', "cd '/workspace/src' && 'ls'"],
        }),
      );
    });

    it('should execute command with environment variables', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockExec.inspect.mockResolvedValue({ ExitCode: 0 });
      mockDocker.modem.demuxStream.mockImplementation(() => {});

      await service.ensureContainer('test-id');

      const resultPromise = service.executeCommand({
        containerId: 'test-id',
        executable: 'env',
        envVars: ['FOO=bar', 'BAZ=qux'],
      });

      setTimeout(() => mockStream.emit('end'), 10);
      await resultPromise;

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: ['FOO=bar', 'BAZ=qux'],
        }),
      );
    });

    it('should handle command timeout', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockDocker.modem.demuxStream.mockImplementation(
        (_stream: NodeJS.ReadableStream, stdout: PassThrough, _stderr: PassThrough) => {
          stdout.write('partial output');
        },
      );

      await service.ensureContainer('test-id');

      const result = await service.executeCommand({
        containerId: 'test-id',
        executable: 'sleep',
        args: ['100'],
        timeout: 50,
      });

      expect(result.timedOut).toBe(true);
      expect(result.exitCode).toBe(-1);
      expect(result.stdout).toBe('partial output');
      expect(mockStream.destroy).toHaveBeenCalled();
    });

    it('should capture stderr output', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockExec.inspect.mockResolvedValue({ ExitCode: 1 });

      mockDocker.modem.demuxStream.mockImplementation(
        (_stream: NodeJS.ReadableStream, _stdout: PassThrough, stderr: PassThrough) => {
          stderr.write('error message');
        },
      );

      await service.ensureContainer('test-id');

      const resultPromise = service.executeCommand({
        containerId: 'test-id',
        executable: 'failing-cmd',
      });

      setTimeout(() => mockStream.emit('end'), 10);

      const result = await resultPromise;

      expect(result.stderr).toBe('error message');
      expect(result.exitCode).toBe(1);
    });

    it('should not trim output when trimOutput is false', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockExec.inspect.mockResolvedValue({ ExitCode: 0 });

      mockDocker.modem.demuxStream.mockImplementation(
        (_stream: NodeJS.ReadableStream, stdout: PassThrough, _stderr: PassThrough) => {
          stdout.write('  output with spaces  ');
        },
      );

      await service.ensureContainer('test-id');

      const resultPromise = service.executeCommand({
        containerId: 'test-id',
        executable: 'echo',
        trimOutput: false,
      });

      setTimeout(() => mockStream.emit('end'), 10);

      const result = await resultPromise;

      expect(result.stdout).toBe('  output with spaces  ');
    });

    it('should reject path traversal in working directory', async () => {
      // Note: The path /workspace/../../../etc normalizes to /etc which contains ".."
      // during normalization traversing outside the intended directory
      await expect(
        service.executeCommand({
          containerId: 'test-id',
          executable: 'ls',
          workingDirectory: '../../../etc',
        }),
      ).rejects.toThrow('Path traversal detected');
    });

    it('should escape shell arguments properly', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockExec.inspect.mockResolvedValue({ ExitCode: 0 });
      mockDocker.modem.demuxStream.mockImplementation(() => {});

      await service.ensureContainer('test-id');

      const resultPromise = service.executeCommand({
        containerId: 'test-id',
        executable: 'echo',
        args: ["hello'world", 'test;rm -rf /'],
      });

      setTimeout(() => mockStream.emit('end'), 10);
      await resultPromise;

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Cmd: ['sh', '-c', "cd '/' && 'echo' 'hello'\\''world' 'test;rm -rf /'"],
        }),
      );
    });

    it('should handle stream errors', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockDocker.modem.demuxStream.mockImplementation(() => {});

      await service.ensureContainer('test-id');

      const resultPromise = service.executeCommand({
        containerId: 'test-id',
        executable: 'test',
      });

      setTimeout(() => mockStream.emit('error', new Error('Stream error')), 10);

      await expect(resultPromise).rejects.toThrow('Stream error');
    });
  });

  describe('getDockerContainerId', () => {
    it('should return undefined for non-existent container', () => {
      expect(service.getDockerContainerId('non-existent')).toBeUndefined();
    });

    it('should return docker container id for existing container', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      await service.ensureContainer('test-id');

      expect(service.getDockerContainerId('test-id')).toBe('docker-container-id-123');
    });
  });

  describe('getContainerStatus', () => {
    it('should return not registered for unknown container', async () => {
      const status = await service.getContainerStatus('unknown');

      expect(status).toEqual({
        registered: false,
        exists: false,
        running: false,
      });
    });

    it('should return registered but not existing for registered-only container', async () => {
      service.registerContainer('test-id', testConfig);

      const status = await service.getContainerStatus('test-id');

      expect(status).toEqual({
        registered: true,
        exists: false,
        running: false,
      });
    });

    it('should return full status for running container', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      await service.ensureContainer('test-id');

      const status = await service.getContainerStatus('test-id');

      expect(status).toEqual({
        registered: true,
        exists: true,
        running: true,
        dockerId: 'docker-container-id-123',
      });
    });

    it('should return stopped status for stopped container', async () => {
      service.registerContainer('test-id', testConfig);

      // First ensure creates the container
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      await service.ensureContainer('test-id');

      // Then status check shows stopped - override with once
      mockContainer.inspect.mockResolvedValueOnce({
        State: { Running: false },
      });
      const status = await service.getContainerStatus('test-id');

      expect(status).toEqual({
        registered: true,
        exists: true,
        running: false,
        dockerId: 'docker-container-id-123',
      });
    });

    it('should handle inspect errors gracefully', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      await service.ensureContainer('test-id');

      // Override with rejection for the status check
      mockContainer.inspect.mockRejectedValueOnce(new Error('Container gone'));
      const status = await service.getContainerStatus('test-id');

      expect(status).toEqual({
        registered: true,
        exists: false,
        running: false,
      });
    });
  });

  describe('stopContainer', () => {
    it('should do nothing for non-existent container', async () => {
      await expect(service.stopContainer('non-existent')).resolves.not.toThrow();
    });

    it('should stop a running container', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      mockContainer.stop.mockResolvedValue({});

      await service.ensureContainer('test-id');
      await service.stopContainer('test-id');

      expect(mockContainer.stop).toHaveBeenCalled();
    });

    it('should not stop already stopped container', async () => {
      service.registerContainer('test-id', testConfig);
      // First inspect for ensureContainer (container running during creation)
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      await service.ensureContainer('test-id');

      // Override for stopContainer check - container now stopped
      mockContainer.inspect.mockResolvedValueOnce({
        State: { Running: false },
      });
      await service.stopContainer('test-id');

      expect(mockContainer.stop).not.toHaveBeenCalled();
    });

    it('should handle stop errors gracefully', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      mockContainer.stop.mockRejectedValue(new Error('Stop failed'));

      await service.ensureContainer('test-id');
      await expect(service.stopContainer('test-id')).resolves.not.toThrow();
    });
  });

  describe('removeContainer', () => {
    it('should do nothing for non-existent container', async () => {
      await expect(service.removeContainer('non-existent')).resolves.not.toThrow();
    });

    it('should remove container and clear from cache', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      mockContainer.remove.mockResolvedValue({});

      await service.ensureContainer('test-id');
      await service.removeContainer('test-id');

      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
      expect(service.getDockerContainerId('test-id')).toBeUndefined();
    });

    it('should handle remove errors gracefully', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      mockContainer.remove.mockRejectedValue(new Error('Remove failed'));

      await service.ensureContainer('test-id');
      await expect(service.removeContainer('test-id')).resolves.not.toThrow();
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop all containers and clear state', async () => {
      service.registerContainer('test-id-1', testConfig);
      service.registerContainer('test-id-2', {
        ...testConfig,
        containerName: 'test-container-2',
      });

      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      mockContainer.stop.mockResolvedValue({});

      await service.ensureContainer('test-id-1');
      await service.ensureContainer('test-id-2');

      await service.onModuleDestroy();

      expect(mockContainer.stop).toHaveBeenCalledTimes(2);
      expect(service.getRegisteredContainerIds()).toHaveLength(0);
    });
  });

  describe('pullImage error handling', () => {
    it('should throw when docker.pull passes an error to callback', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      const imageInspect = jest.fn().mockRejectedValue(new Error('Not found'));
      mockDocker.getImage.mockReturnValue({ inspect: imageInspect });

      // Mock pull to pass an error to the callback
      mockDocker.pull.mockImplementation(
        (_imageName: string, callback: (err: Error | null, stream: NodeJS.ReadableStream) => void) => {
          callback(new Error('Network error: unable to pull image'), null as any);
        },
      );

      await expect(service.ensureContainer('test-id')).rejects.toThrow('Network error: unable to pull image');
    });

    it('should throw when modem.followProgress passes an error', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      const imageInspect = jest.fn().mockRejectedValue(new Error('Not found'));
      mockDocker.getImage.mockReturnValue({ inspect: imageInspect });

      // Mock pull to succeed but followProgress to fail
      mockDocker.pull.mockImplementation(
        (_imageName: string, callback: (err: Error | null, stream: NodeJS.ReadableStream) => void) => {
          const stream = new PassThrough();
          callback(null, stream);
        },
      );

      mockDocker.modem.followProgress.mockImplementation(
        (_stream: NodeJS.ReadableStream, callback: (err: Error | null) => void) => {
          callback(new Error('Pull interrupted: connection reset'));
        },
      );

      await expect(service.ensureContainer('test-id')).rejects.toThrow('Pull interrupted: connection reset');
    });
  });

  describe('createNewContainer error handling', () => {
    it('should throw when docker.createContainer fails', async () => {
      service.registerContainer('test-id', testConfig);

      mockDocker.createContainer.mockRejectedValue(new Error('Insufficient resources to create container'));

      await expect(service.ensureContainer('test-id')).rejects.toThrow('Insufficient resources to create container');
    });

    it('should throw when container.start fails after creation', async () => {
      service.registerContainer('test-id', testConfig);

      mockContainer.start.mockRejectedValue(new Error('Port 8080 already in use'));

      await expect(service.ensureContainer('test-id')).rejects.toThrow('Port 8080 already in use');
    });
  });

  describe('concurrent operations on different containerIds', () => {
    it('should allow parallel operations on different containers', async () => {
      service.registerContainer('container-1', {
        ...testConfig,
        containerName: 'test-container-1',
      });
      service.registerContainer('container-2', {
        ...testConfig,
        containerName: 'test-container-2',
      });

      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      const executionOrder: string[] = [];
      let container1Resolve: () => void;
      let container2Resolve: () => void;

      const container1Promise = new Promise<void>((resolve) => {
        container1Resolve = resolve;
      });
      const container2Promise = new Promise<void>((resolve) => {
        container2Resolve = resolve;
      });

      mockDocker.createContainer.mockImplementation(async (config: any) => {
        executionOrder.push(`start-${config.name}`);
        if (config.name === 'test-container-1') {
          await container1Promise;
        } else {
          await container2Promise;
        }
        executionOrder.push(`end-${config.name}`);
        return mockContainer;
      });

      // Start both operations
      const promise1 = service.ensureContainer('container-1');
      const promise2 = service.ensureContainer('container-2');

      // Allow some time for both to start
      await new Promise((r) => setTimeout(r, 10));

      // Both should have started (not serialized)
      expect(executionOrder).toContain('start-test-container-1');
      expect(executionOrder).toContain('start-test-container-2');

      // Complete them
      container2Resolve!();
      container1Resolve!();

      await Promise.all([promise1, promise2]);

      // Verify both completed
      expect(executionOrder).toContain('end-test-container-1');
      expect(executionOrder).toContain('end-test-container-2');
    });

    it('should serialize operations on same containerId while allowing parallel on different', async () => {
      service.registerContainer('container-1', {
        ...testConfig,
        containerName: 'test-container-1',
      });
      service.registerContainer('container-2', {
        ...testConfig,
        containerName: 'test-container-2',
      });

      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      const executionOrder: string[] = [];
      const resolvers: { [key: string]: () => void } = {};

      mockDocker.createContainer.mockImplementation(async (config: any) => {
        executionOrder.push(`start-${config.name}`);
        await new Promise<void>((resolve) => {
          resolvers[config.name] = resolve;
        });
        executionOrder.push(`end-${config.name}`);
        return mockContainer;
      });

      // Start three operations: two on container-1, one on container-2
      const promise1a = service.ensureContainer('container-1');
      const promise1b = service.ensureContainer('container-1');
      const promise2 = service.ensureContainer('container-2');

      // Allow time to start
      await new Promise((r) => setTimeout(r, 10));

      // container-1 first call and container-2 should have started
      // container-1 second call should be waiting (serialized)
      expect(executionOrder).toEqual(['start-test-container-1', 'start-test-container-2']);

      // Complete container-2
      resolvers['test-container-2']();
      await promise2;

      expect(executionOrder).toContain('end-test-container-2');

      // Complete container-1 first call
      resolvers['test-container-1']();
      await promise1a;

      // Second call for container-1 should now use cached container (no new createContainer)
      await promise1b;

      // createContainer should only be called twice total (once per container)
      expect(mockDocker.createContainer).toHaveBeenCalledTimes(2);
    });
  });

  describe('re-registration behavior', () => {
    it('should overwrite config when re-registering with same id', () => {
      const newConfig: ContainerConfig = {
        imageName: 'new-image:v2',
        containerName: 'new-container',
        projectOutPath: '/new/path',
        rootPath: 'new-workspace',
      };

      service.registerContainer('test-id', testConfig);
      service.registerContainer('test-id', newConfig);

      // Should still have only one registered container
      expect(service.getRegisteredContainerIds()).toHaveLength(1);
    });

    it('should use new config after re-registration', async () => {
      const newConfig: ContainerConfig = {
        imageName: 'new-image:v2',
        containerName: 'new-container',
        projectOutPath: '/new/path',
        rootPath: 'new-workspace',
      };

      service.registerContainer('test-id', testConfig);
      service.registerContainer('test-id', newConfig);

      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      await service.ensureContainer('test-id');

      expect(mockDocker.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          Image: 'new-image:v2',
          name: 'new-container',
          HostConfig: {
            Binds: ['/new/path:/new-workspace'],
          },
        }),
      );
    });

    it('should not affect existing container instance when re-registering', async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });

      // Create container with original config
      await service.ensureContainer('test-id');

      // Re-register with new config
      const newConfig: ContainerConfig = {
        imageName: 'new-image:v2',
        containerName: 'new-container',
        projectOutPath: '/new/path',
        rootPath: 'new-workspace',
      };
      service.registerContainer('test-id', newConfig);

      // Existing container should still be returned (cached)
      const container = await service.ensureContainer('test-id');
      expect(container).toBe(mockContainer);

      // createContainer should only have been called once (original)
      expect(mockDocker.createContainer).toHaveBeenCalledTimes(1);
    });
  });

  describe('findExistingContainer error handling', () => {
    it('should remove and recreate container when start fails on existing container', async () => {
      service.registerContainer('test-id', testConfig);

      // First, listContainers finds an existing container
      mockDocker.listContainers.mockResolvedValue([{ Id: 'existing-id', Names: ['/test-container'] }]);

      const existingContainer = {
        id: 'existing-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: false } }),
        start: jest.fn().mockRejectedValue(new Error('Container corrupted')),
        remove: jest.fn().mockResolvedValue({}),
      };

      const newContainer = {
        id: 'new-container-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: true } }),
        start: jest.fn().mockResolvedValue({}),
      };

      mockDocker.getContainer.mockReturnValueOnce(existingContainer);
      mockDocker.createContainer.mockResolvedValue(newContainer);

      const container = await service.ensureContainer('test-id');

      // Should have tried to remove the corrupted container
      expect(existingContainer.remove).toHaveBeenCalledWith({ force: true });

      // Should have created a new container
      expect(mockDocker.createContainer).toHaveBeenCalled();
      expect(container).toBe(newContainer);
    });

    it('should handle removal error gracefully and still create new container', async () => {
      service.registerContainer('test-id', testConfig);

      mockDocker.listContainers.mockResolvedValue([{ Id: 'existing-id', Names: ['/test-container'] }]);

      const existingContainer = {
        id: 'existing-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: false } }),
        start: jest.fn().mockRejectedValue(new Error('Container corrupted')),
        remove: jest.fn().mockRejectedValue(new Error('Remove failed')),
      };

      const newContainer = {
        id: 'new-container-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: true } }),
        start: jest.fn().mockResolvedValue({}),
      };

      mockDocker.getContainer.mockReturnValueOnce(existingContainer);
      mockDocker.createContainer.mockResolvedValue(newContainer);

      const container = await service.ensureContainer('test-id');

      // Should still create new container even if removal failed
      expect(mockDocker.createContainer).toHaveBeenCalled();
      expect(container).toBe(newContainer);
    });

    it('should recreate when cached container reference becomes invalid', async () => {
      service.registerContainer('test-id', testConfig);

      // First call creates and caches container
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      await service.ensureContainer('test-id');

      // Reset mocks
      mockDocker.createContainer.mockClear();

      // Second call: cached container inspect fails (container was removed externally)
      mockContainer.inspect.mockRejectedValueOnce(new Error('No such container'));

      // listContainers also returns empty (container truly gone)
      mockDocker.listContainers.mockResolvedValue([]);

      // Set up for new container creation
      const newContainer = {
        id: 'new-container-id',
        inspect: jest.fn().mockResolvedValue({ State: { Running: true } }),
        start: jest.fn().mockResolvedValue({}),
      };
      mockDocker.createContainer.mockResolvedValue(newContainer);

      const container = await service.ensureContainer('test-id');

      // Should have created a new container
      expect(mockDocker.createContainer).toHaveBeenCalled();
      expect(container).toBe(newContainer);
    });
  });

  describe('path validation', () => {
    beforeEach(async () => {
      service.registerContainer('test-id', testConfig);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      await service.ensureContainer('test-id');
    });

    it('should normalize relative paths to absolute', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockExec.inspect.mockResolvedValue({ ExitCode: 0 });
      mockDocker.modem.demuxStream.mockImplementation(() => {});

      const resultPromise = service.executeCommand({
        containerId: 'test-id',
        executable: 'ls',
        workingDirectory: 'relative/path',
      });

      setTimeout(() => mockStream.emit('end'), 10);
      await resultPromise;

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Cmd: ['sh', '-c', "cd '/relative/path' && 'ls'"],
        }),
      );
    });

    it('should normalize paths with extra slashes', async () => {
      const mockStream = new PassThrough() as PassThrough & {
        destroy: () => void;
      };
      mockStream.destroy = jest.fn();
      mockExec.start.mockResolvedValue(mockStream);
      mockExec.inspect.mockResolvedValue({ ExitCode: 0 });
      mockDocker.modem.demuxStream.mockImplementation(() => {});

      const resultPromise = service.executeCommand({
        containerId: 'test-id',
        executable: 'ls',
        workingDirectory: '/workspace//src///nested',
      });

      setTimeout(() => mockStream.emit('end'), 10);
      await resultPromise;

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Cmd: ['sh', '-c', "cd '/workspace/src/nested' && 'ls'"],
        }),
      );
    });
  });
});
