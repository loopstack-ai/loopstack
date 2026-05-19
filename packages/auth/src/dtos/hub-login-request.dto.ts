import { Expose } from 'class-transformer';
import type { HubLoginRequestInterface } from '@loopstack/contracts/api';

export class HubLoginRequestDto implements HubLoginRequestInterface {
  @Expose()
  idToken: string;
}
