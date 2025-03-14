export const LOOP_ADAPTER_DECORATOR =
  'LOOP_ADAPTER_DECORATOR';

export function Adapter(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(LOOP_ADAPTER_DECORATOR, true, target);
  };
}
