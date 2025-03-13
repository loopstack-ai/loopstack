export const LOOP_STATE_MACHINE_ACTION_DECORATOR =
  'LOOP_STATE_MACHINE_ACTION_DECORATOR';

export function StateMachineAction(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(LOOP_STATE_MACHINE_ACTION_DECORATOR, true, target);
  };
}
