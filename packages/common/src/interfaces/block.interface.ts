import { z } from 'zod';
import { Scope, Type } from '@nestjs/common';
import type { BlockConfigType, JSONSchemaConfigType } from '@loopstack/contracts/types';

export interface BlockOptions {
  type?: string;
  scope?: Scope;
  imports?: any[];
  config?: Partial<BlockConfigType>;
  configFile?: string;
  properties?: z.ZodType,
  configSchema?: z.ZodType,
}

export interface BlockMetadata {
  imports: Type<any>[];
  config: BlockConfigType;
  configFile?: string;
  properties?: z.ZodType,
  propertiesSchema?: JSONSchemaConfigType;
  configSchema?: z.ZodType,
  inputProperties: string[];
  outputProperties: string[];
}