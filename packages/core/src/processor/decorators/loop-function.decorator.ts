export const LOOP_FUNCTION_DECORATOR = 'LOOP_FUNCTION_DECORATOR';

export function LoopFunction(options: any = {}): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(LOOP_FUNCTION_DECORATOR, options, target);
  };
}
