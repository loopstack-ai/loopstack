import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { Role } from './role.entity';
import { PermissionInterface } from '../interfaces';

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

  @ManyToMany(() => Role, role => role.permissions)
  roles!: Role[];
}