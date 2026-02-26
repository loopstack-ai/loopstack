import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  TOOL_EXECUTION_INTERCEPTORS,
  ToolExecutionContext,
  ToolExecutionInterceptor,
  ToolResult,
} from '@loopstack/common';

@Injectable()
export class ToolExecutionInterceptorService {
  private readonly interceptors: ToolExecutionInterceptor[];

  constructor(
    @Optional()
    @Inject(TOOL_EXECUTION_INTERCEPTORS)
    interceptor?: ToolExecutionInterceptor,
  ) {
    this.interceptors = interceptor ? [interceptor] : [];
  }

  async beforeExecute(context: ToolExecutionContext): Promise<void> {
    for (const interceptor of this.interceptors) {
      if (interceptor.beforeExecute) {
        await interceptor.beforeExecute(context);
      }
    }
  }

  async afterExecute(context: ToolExecutionContext, result: ToolResult): Promise<void> {
    for (const interceptor of this.interceptors) {
      if (interceptor.afterExecute) {
        await interceptor.afterExecute(context, result);
      }
    }
  }

  async onError(context: ToolExecutionContext, error: unknown): Promise<void> {
    for (const interceptor of this.interceptors) {
      if (interceptor.onError) {
        await interceptor.onError(context, error);
      }
    }
  }
}
