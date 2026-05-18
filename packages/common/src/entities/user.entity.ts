import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { UserTypeEnum } from '../enums/user-type.enum.js';
import { Role } from './role.entity.js';

@Entity('auth_users')
export class User {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({
    type: 'enum',
    enum: UserTypeEnum,
  })
  type!: UserTypeEnum;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'auth_user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: Relation<Role[]>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
