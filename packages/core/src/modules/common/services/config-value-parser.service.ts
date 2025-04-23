import { Injectable } from '@nestjs/common';
import { FunctionCallService } from './function-call.service';
import {
  ContextInterface,
  EvalContextInfo,
  WorkflowData,
} from '@loopstack/shared';

@Injectable()
export class ConfigValueParserService {
  constructor(private functionCallService: FunctionCallService) {}

  private evalObjectLeafs<T>(obj: any, variables: any): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return this.functionCallService.runEval(obj, variables) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.evalObjectLeafs(item, variables),
      ) as unknown as T;
    }

    const result = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.evalObjectLeafs(obj[key], variables);
      }
    }

    return result;
  }

  evalWithContext<T>(obj: any, variables: { context: ContextInterface }): T {
    return obj ? this.evalObjectLeafs<T>(obj, variables) : ({} as any);
  }

  evalWithContextAndInfo<T extends {}>(
    obj: any,
    variables: { context: ContextInterface; info: EvalContextInfo },
  ): T {
    return obj ? this.evalObjectLeafs<T>(obj, variables) : ({} as any);
  }

  evalWithContextAndItem<T extends {}>(
    obj: any,
    variables: { context: ContextInterface; item: string },
  ): T {
    return obj ? this.evalObjectLeafs<T>(obj, variables) : ({} as any);
  }

  evalWithContextAndDataAndInfo<T extends {}>(
    obj: any,
    variables: {
      context: ContextInterface;
      data: WorkflowData | undefined | null;
      info: EvalContextInfo;
    },
  ): T {
    return obj ? this.evalObjectLeafs<T>(obj, variables) : ({} as any);
  }
}
