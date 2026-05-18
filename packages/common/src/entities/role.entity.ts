import { Column, Entity, ManyToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { RoleInterface } from '../interfaces/index.js';
import { User } from './user.entity.js';

@Entity('auth_roles')
export class Role implements RoleInterface {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @ManyToMany(() => User, (user) => user.roles)
  users!: Relation<User[]>;
}
