import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Repository } from 'typeorm';
import { Role, RoleName, User } from '@loopstack/common';

interface AssignRoleCommandOptions {
  role: RoleName;
}

@Command({
  name: 'assign-role',
  description: 'Assign a role to an existing user',
  arguments: '<userId>',
})
export class AssignRoleCommand extends CommandRunner {
  private readonly logger = new Logger(AssignRoleCommand.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {
    super();
  }

  async run(inputs: string[], options: AssignRoleCommandOptions): Promise<void> {
    const [userId] = inputs;

    if (!userId) {
      console.error('Please specify a user ID');
      console.log('Usage: loopstack assign-role <userId> --role ADMIN');
      process.exit(1);
    }

    const roleName = options.role;
    if (!roleName) {
      console.error('Please specify a role with --role');
      console.log(`Available roles: ${Object.values(RoleName).join(', ')}`);
      process.exit(1);
    }

    if (!Object.values(RoleName).includes(roleName)) {
      console.error(`Invalid role: ${roleName}`);
      console.log(`Available roles: ${Object.values(RoleName).join(', ')}`);
      process.exit(1);
    }

    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });

      if (!user) {
        console.error(`User with ID '${userId}' not found`);
        process.exit(1);
      }

      if (user.roles.some((r) => r.name === (roleName as string))) {
        console.log(`User '${userId}' already has role '${roleName}'`);
        return;
      }

      let role = await this.roleRepository.findOne({ where: { name: roleName } });

      if (!role) {
        role = this.roleRepository.create({
          name: roleName,
          description: `${roleName} role`,
        });
        role = await this.roleRepository.save(role);
        this.logger.log(`Created role '${roleName}'`);
      }

      user.roles.push(role);
      await this.userRepository.save(user);

      console.log(`Role '${roleName}' assigned to user '${userId}'`);
    } catch (error) {
      console.error('Failed to assign role:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  @Option({
    flags: '-r, --role <role>',
    description: `Role to assign (${Object.values(RoleName).join(', ')})`,
    required: true,
  })
  parseRole(val: string): RoleName {
    return val as RoleName;
  }
}
