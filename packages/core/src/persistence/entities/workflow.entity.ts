import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NamespacesType } from '../../processor/interfaces/namespaces-type';
import { WorkflowStateEntity } from './workflow-state.entity';
import { ProjectEntity } from './project.entity';
import { UserInputEntity } from './user-input.entity';
import { WorkspaceEntity } from './workspace.entity';
import { DocumentEntity } from './document.entity';

@Entity({ name: 'workflow' })
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column('jsonb', { default: {} })
  namespaces: NamespacesType;

  @Column({ type: 'varchar', name: 'options_hash', nullable: true })
  optionsHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  error: string | null;

  @Column({ name: 'is_working', default: false })
  isWorking: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(
    () => WorkflowStateEntity,
    (workflowStateMachine) => workflowStateMachine.workflow,
    {
      onDelete: 'CASCADE',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'state_id' })
  state: WorkflowStateEntity;

  @Column({ name: 'state_id', nullable: true })
  stateId: string;

  @ManyToOne(() => ProjectEntity, (project) => project.workflows, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.workflows, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace: WorkspaceEntity;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToMany(() => DocumentEntity, (document) => document.dependentStates)
  dependencies: DocumentEntity[];

  @Column({ type: 'varchar', nullable: true })
  dependenciesHash: string | null;

  @OneToMany(
    () => UserInputEntity,
    (userInput) => userInput.workflow,
    // { cascade: ['insert', 'update', 'remove'] }
  )
  userInputs: UserInputEntity[];

  @OneToMany(
    () => DocumentEntity,
    (document: DocumentEntity) => document.workflow,
    { cascade: true },
  )
  documents: DocumentEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
