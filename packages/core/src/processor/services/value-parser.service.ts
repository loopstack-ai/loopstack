import { Injectable } from '@nestjs/common';
import { TemplateEngineService } from './template-engine.service';
import {GetterFunctionService} from "./getter-function.service";

@Injectable()
export class ValueParserService {
  constructor(
    private templateEngineService: TemplateEngineService,
    private getterFunctionService: GetterFunctionService,
  ) {}

  parseValue(
      value: string | string[],
      variables: Record<string, any>,
  ){
    if (Array.isArray(value)) {
      return value.map((item) => this.parseValue(item, variables));
    }

    if (this.templateEngineService.isTemplate(value)) {
      return this.templateEngineService.parseValue(value, variables);
    }

    if (this.getterFunctionService.isGetter(value)) {
      return this.getterFunctionService.parseValue(value, variables);
    }

    return value;
  }

  parseObjectValues(
      obj: Record<string, any>,
      variables: Record<string, any>,
  ): any {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          this.parseValue(value, variables),
        ]),
    );
  }

}
