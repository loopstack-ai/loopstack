export const LOOP_TOOL_DECORATOR = 'LOOP_TOOL_DECORATOR';

export function Tool(options: any = {}): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(LOOP_TOOL_DECORATOR, options, target);
  };
}
