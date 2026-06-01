import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { WorkflowEntity } from './workflow.entity.js';

@Entity({ name: 'core_workspace' })
export class WorkspaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  title!: string;

  @Column({ type: 'varchar', name: 'app_name' })
  @Index()
  appName!: string;

  @Column({ name: 'is_favourite', default: false })
  isFavourite!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => WorkflowEntity, (workflow) => workflow.workspace, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  workflows!: Relation<WorkflowEntity[]>;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: Relation<User>;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy!: string;
}
