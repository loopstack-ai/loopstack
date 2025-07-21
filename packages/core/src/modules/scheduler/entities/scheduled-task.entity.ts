import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TaskType {
  ONE_TIME_DATE = 'one_time_date',
  ONE_TIME_DURATION = 'one_time_duration',
  RECURRING_CRON = 'recurring_cron',
}

export enum TaskStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('scheduled_tasks')
@Index(['workspaceId', 'rootPipelineId', 'name'], { unique: true })
@Index(['status', 'nextExecutionAt'])
@Index(['workspaceId'])
export class ScheduledTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  workspaceId: string;

  @Column({ type: 'varchar', length: 255 })
  rootPipelineId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: TaskType,
  })
  type: TaskType;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.ACTIVE,
  })
  status: TaskStatus;

  // For ONE_TIME_DATE: the specific date/time
  // For ONE_TIME_DURATION: calculated from createdAt + duration
  // For RECURRING_CRON: calculated from cron expression
  @Column({ type: 'timestamp', nullable: true })
  nextExecutionAt: Date | null;

  // For ONE_TIME_DURATION: duration in seconds
  @Column({ type: 'integer', nullable: true })
  durationSeconds: number;

  // For RECURRING_CRON: cron expression
  @Column({ type: 'varchar', length: 255, nullable: true })
  cronExpression: string;

  // Additional payload data for the task
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'integer', default: 0 })
  executionCount: number;

  @Column({ type: 'integer', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutionAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastFailureAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}