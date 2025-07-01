import { Injectable } from '@nestjs/common';

@Injectable()
export class ValueHandlebarsHelperService {

  getValueHelper() {
    return (...args: any[]): string => {
      const [expression] = args.slice(0, -1);
      return expression;
    }
  }

}