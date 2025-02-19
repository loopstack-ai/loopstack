import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { ModelSchemaValidatorService } from './model-schema-validator.service';

describe('ModelSchemaValidatorService', () => {
  let service: ModelSchemaValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModelSchemaValidatorService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<ModelSchemaValidatorService>(
      ModelSchemaValidatorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a valid schema object', () => {
    const schema = service.getMainSchema();
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
    expect(schema).not.toBeNull();
  });
});
