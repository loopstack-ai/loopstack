import { Injectable } from '@nestjs/common';
import { ContextInterface } from '../interfaces/context.interface';
import _ from 'lodash';
import { ProcessRunInterface } from '../interfaces/process-run.interface';

@Injectable()
export class ContextService {
  create(payload: ProcessRunInterface | ContextInterface): ContextInterface {
    return _.cloneDeep(payload) as ContextInterface;
  }
}
