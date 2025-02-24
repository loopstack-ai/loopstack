export const LOOP_STATE_MACHINE_VALIDATOR_DECORATOR = 'LOOP_STATE_MACHINE_VALIDATOR_DECORATOR';

export function StateMachineValidator(options: { priority: number; }): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(LOOP_STATE_MACHINE_VALIDATOR_DECORATOR, options, target);
  };
}
