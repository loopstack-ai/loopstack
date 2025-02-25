import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { WorkflowEntity } from './workflow.entity';

@Entity({ name: 'user_input' })
export class UserInputEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb', { default: {} })
  data: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.userInputs, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowEntity;

  @Column({ name: 'workflow_id' })
  workflowId: string;

  @ManyToOne(() => ProjectEntity, (project) => project.userInputs, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
