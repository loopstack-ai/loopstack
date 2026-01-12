import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { UserTypeEnum } from '../enums/user-type.enum';
import { Role } from './role.entity';

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
  roles!: Role[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
