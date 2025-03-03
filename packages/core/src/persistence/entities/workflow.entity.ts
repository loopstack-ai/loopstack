import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { DocumentEntity } from './document.entity';
import { NamespaceEntity } from './namespace.entity';
import { WorkflowStateHistoryDto, WorkflowStatePlaceInfoDto } from '../dtos';

@Entity({ name: 'workflow' })
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ default: 0 })
  index: number;

  @Column({ type: 'varchar', name: 'options_hash', nullable: true })
  optionsHash: string | null;

  @Column({ default: 0 })
  progress: number;

  @Column({ type: 'varchar', nullable: true })
  error: string | null;

  @Column({ name: 'is_working', default: false })
  isWorking: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar' })
  place: string;

  @Column('jsonb', {
    name: 'place_info',
    nullable: true,
  })
  placeInfo: WorkflowStatePlaceInfoDto | null;

  @Column('jsonb', { name: 'history', nullable: true })
  history: WorkflowStateHistoryDto | null;

  @ManyToOne(() => ProjectEntity, (project) => project.workflows, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'project_id', nullable: true })
  projectId: string;

  @ManyToMany(() => NamespaceEntity, (namespace) => namespace.workflows)
  @JoinTable({
    name: 'workflow_namespace',
    joinColumn: {
      name: 'workflow_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'namespace_id',
      referencedColumnName: 'id',
    },
  })
  namespaces: NamespaceEntity[];

  @ManyToMany(() => DocumentEntity, (document) => document.dependentStates)
  @JoinTable({
    name: 'workflow_document',
    joinColumn: {
      name: 'workflow_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'document_id',
      referencedColumnName: 'id',
    },
  })
  dependencies: DocumentEntity[];

  @Column({ type: 'varchar', nullable: true })
  dependenciesHash: string | null;

  @OneToMany(
    () => DocumentEntity,
    (document: DocumentEntity) => document.workflow,
    {
      cascade: true,
      onDelete: 'CASCADE',
    },
  )
  documents: DocumentEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
