import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PermissionInterface } from '../interfaces';
import { Role } from './role.entity';

@Entity('auth_permissions')
export class Permission implements PermissionInterface {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column()
  resource!: string;

  @Column()
  action!: string;

  @Column({ nullable: true })
  description!: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
