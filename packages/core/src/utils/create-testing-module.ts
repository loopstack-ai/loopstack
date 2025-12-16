import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

export function createTestingModule(options: { imports: any[], providers: any[]}): TestingModuleBuilder {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'admin',
        database: 'e2e_test',
        autoLoadEntities: true,
        synchronize: true,
        dropSchema: true,
        logging: false,
      }),
      ...options.imports,
    ],
    providers: [
      ...options.providers,
    ]
  });
}
