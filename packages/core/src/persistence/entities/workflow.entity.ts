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
import { DocumentEntity } from './document.entity';
import { NamespaceEntity } from './namespace.entity';
import { WorkflowStateHistoryDto, WorkflowStatePlaceInfoDto } from '../dtos';

@Entity({ name: 'workflow' })
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  title: string;

  @Column("ltree", { default: '1' })
  index: string;

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

  @ManyToOne(() => NamespaceEntity, (namespace) => namespace.workflows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'namespace_id' })
  namespace: NamespaceEntity;

  @Column({ name: 'namespace_id' })
  namespaceId: string;

  @Column('varchar',{ name: 'labels', array: true, default: [] })
  labels: string[];

  @ManyToMany(() => DocumentEntity, (document) => document.dependentStates, {
      onDelete: 'CASCADE'
  })
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
