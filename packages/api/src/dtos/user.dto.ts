import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  id: string | null;

  constructor(id: string | null = null) {
    this.id = id;
  }
}
