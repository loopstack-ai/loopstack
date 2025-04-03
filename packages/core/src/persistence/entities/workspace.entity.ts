import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { WorkspaceEntityInterface } from '@loopstack/shared';

@Entity({ name: 'workspace' })
export class WorkspaceEntity implements WorkspaceEntityInterface {
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

  @OneToMany(() => ProjectEntity, (project) => project.workspace, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  projects: ProjectEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
