import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RoleInterface } from '../interfaces';
import { Permission } from './permission.entity';
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

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'auth_role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: Permission[];
}
