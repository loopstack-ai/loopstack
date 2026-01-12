import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { WorkspaceEntity } from "./workspace.entity";
import { PipelineEntity } from "./pipeline.entity";

@Entity({ name: "core_event_subscriber" })
@Index(["eventPipelineId", "eventName"])
@Index(["subscriberPipelineId", "subscriberWorkflowId", "subscriberTransition"])
export class EventSubscriberEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => PipelineEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "subscriber_pipeline_id" })
  subscriberPipeline!: PipelineEntity;

  @Column({ type: "uuid", name: "subscriber_pipeline_id" })
  @Index()
  subscriberPipelineId!: string;

  @Column({ type: "uuid", name: "subscriber_workflow_id" })
  subscriberWorkflowId!: string;

  @Column({ type: "varchar", name: "subscriber_transition" })
  subscriberTransition!: string;

  @Column({ type: "uuid", name: "event_pipeline_id" })
  @Index()
  eventPipelineId!: string;

  @Column({ type: "varchar", name: "event_name" })
  @Index()
  eventName!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne(() => WorkspaceEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace!: WorkspaceEntity;

  @Column({ name: "workspace_id", nullable: true })
  workspaceId!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "once", type: "boolean", default: true })
  once!: boolean;
}
