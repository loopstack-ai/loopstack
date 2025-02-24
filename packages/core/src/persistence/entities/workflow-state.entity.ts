import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NamespacesType } from '../../processor/interfaces/namespaces-type';
import { WorkflowStateMachine } from './workflow-state-machine.entity';

@Entity()
export class WorkflowState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column('jsonb', { nullable: false, default: {} })
  namespaces: NamespacesType;

  @OneToOne(
    () => WorkflowStateMachine,
    (workflowStateMachine) => workflowStateMachine.workflowState,
    {
      cascade: ['insert', 'update'],
    },
  )
  stateMachine: WorkflowStateMachine;

  @Column({ nullable: true })
  optionsHash: string;

  @Column({ type: 'varchar', nullable: true })
  error: string | null;

  @Column({ default: false })
  isWorking: boolean;
}
