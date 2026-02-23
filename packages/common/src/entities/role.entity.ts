import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RoleInterface } from '../interfaces';
import { User } from './user.entity';

@Entity('auth_roles')
export class Role implements RoleInterface {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @ManyToMany(() => User, (user) => user.roles)
  users!: User[];
}
