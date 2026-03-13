import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceEntity } from './workspace.entity';

@Entity({ name: 'core_workspace_environment' })
@Index(['workspaceId', 'slotId'], { unique: true })
export class WorkspaceEnvironmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'slot_id' })
  slotId!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'varchar', name: 'remote_environment_id' })
  remoteEnvironmentId!: string;

  @Column({ type: 'varchar', name: 'provider_app_name', nullable: true })
  envName?: string;

  @Column({ type: 'varchar', name: 'connection_url', nullable: true })
  connectionUrl?: string;

  @Column({ type: 'varchar', name: 'agent_url', nullable: true })
  agentUrl?: string;

  @Column({ type: 'varchar', name: 'worker_id', nullable: true })
  workerId?: string;

  @Column({ type: 'varchar', name: 'worker_url', nullable: true })
  workerUrl?: string;

  @Column({ type: 'boolean', default: false })
  local!: boolean;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.environments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ name: 'workspace_id' })
  workspaceId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
