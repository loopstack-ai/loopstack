import { Injectable } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { UserRepository } from '@loopstack/auth';
import { User } from '@loopstack/common';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async findOneBy(where: FindOptionsWhere<User>): Promise<User | null> {
    return this.userRepository.getRepository().findOne({
      where,
      relations: ['roles', 'roles.permissions'],
    });
  }
}
