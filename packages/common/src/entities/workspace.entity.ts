import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { WorkflowEntity } from './workflow.entity';
import { WorkspaceEnvironmentEntity } from './workspace-environment.entity';

@Entity({ name: 'core_workspace' })
export class WorkspaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  title!: string;

  @Column({ type: 'varchar', name: 'block_name' })
  @Index()
  blockName!: string;

  @Column({ type: 'varchar', name: 'class_name', nullable: true })
  className!: string | null;

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
  workflows!: WorkflowEntity[];

  @OneToMany(() => WorkspaceEnvironmentEntity, (env) => env.workspace, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  environments!: WorkspaceEnvironmentEntity[];

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy!: string;
}
