import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PipelineEntity } from './pipeline.entity';

@Entity({ name: 'core_workspace' })
export class WorkspaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  title!: string;

  @Column({ type: 'varchar', name: 'block_name' })
  @Index()
  blockName!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => PipelineEntity, (pipeline) => pipeline.workspace, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  pipelines!: PipelineEntity[];

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;
}
