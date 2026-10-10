import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserTypeEnum } from '@loopstack/common';

/** Background triggers have no request context — run workflows as the local Studio user. */
@Injectable()
export class RunUserResolver {
  private readonly logger = new Logger(RunUserResolver.name);

  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async resolve(): Promise<string | null> {
    const user = await this.users.findOne({ where: { type: UserTypeEnum.Local } });
    if (!user) {
      this.logger.warn('No local user found yet — open Studio once so a user is created, then the cron will post.');
      return null;
    }
    return user.id;
  }
}
