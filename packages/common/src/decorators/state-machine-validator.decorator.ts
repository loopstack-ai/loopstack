import { Injectable, SetMetadata } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';

export const LOOP_STATE_MACHINE_VALIDATOR_DECORATOR =
  'LOOP_STATE_MACHINE_VALIDATOR_DECORATOR';

export function StateMachineValidator(options: {
  priority: number;
}): ClassDecorator {
  return applyDecorators(
    Injectable(),
    SetMetadata(LOOP_STATE_MACHINE_VALIDATOR_DECORATOR, options),
  );
}