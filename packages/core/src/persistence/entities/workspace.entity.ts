import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { DocumentEntity } from './document.entity';
import {NamespaceEntity} from "./namespace.entity";

@Entity({ name: 'workspace' })
export class WorkspaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ name: 'is_locked', default: false })
  isLocked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => NamespaceEntity, (namespace) => namespace.workspace)
  namespaces: NamespaceEntity[];

  @OneToMany(() => ProjectEntity, (project) => project.workspace)
  projects: ProjectEntity[];

  @OneToMany(
    () => DocumentEntity,
    (workflowDocument) => workflowDocument.workspace,
  )
  workflows: DocumentEntity[];

  @OneToMany(
    () => DocumentEntity,
    (workflowDocument) => workflowDocument.workspace,
  )
  documents: DocumentEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
