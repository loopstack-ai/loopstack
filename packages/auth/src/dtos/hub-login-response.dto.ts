import { Expose } from 'class-transformer';

export class HubLoginResponseDto {
  @Expose()
  id: string;

  @Expose()
  message: string;
}
