import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowEntity } from './workflow.entity';
import {WorkflowStatePlaceInfoDto} from "../dtos";
import {WorkflowStateHistoryDto} from "../dtos";

@Entity({ name: 'workflow_state' })
export class WorkflowStateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  place: string;

  @Column('jsonb', {
    name: 'place_info',
    nullable: true,
  })
  placeInfo: WorkflowStatePlaceInfoDto | null;

  @Column('jsonb', { name: 'history', nullable: true })
  history: WorkflowStateHistoryDto | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => WorkflowEntity, {
    nullable: false,
  })
  workflow: WorkflowEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
