import { Test, TestingModule } from '@nestjs/testing';
import { ModelSchemaValidatorService } from './model-schema-validator.service';
import {ConfigModule, ConfigService} from "@nestjs/config";
import loadSchemas from '../configuration';

describe('ModelSchemaValidatorService', () => {
  let service: ModelSchemaValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [loadSchemas],
        }),
      ],
      providers: [
        ModelSchemaValidatorService,
        ConfigService,
      ],
    }).compile();

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
