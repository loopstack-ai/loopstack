import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
    ManyToMany,
    JoinTable,
    Unique
} from 'typeorm';
import {ProjectEntity} from "./project.entity";
import {WorkflowEntity} from "./workflow.entity";
import {WorkspaceEntity} from "./workspace.entity";

@Entity('namespaces')
@Unique(['name', 'model', 'workspaceId'])
export class NamespaceEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    name: string;

    @Column()
    @Index()
    model: string;

    @ManyToOne(() => NamespaceEntity, namespace => namespace.children, {
        onDelete: 'CASCADE',
        nullable: true,
    })
    @JoinColumn({ name: 'parent_id' })
    parent: NamespaceEntity;

    @Column({ name: 'parent_id', nullable: true })
    @Index()
    parentId: string | null;

    @Column('json', { nullable: true })
    metadata: Record<string, any> | null;

    @OneToMany(() => NamespaceEntity, namespace => namespace.parent)
    children: NamespaceEntity[];

    @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.namespaces, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'workspace_id' })
    workspace: WorkspaceEntity;

    @Column({ name: 'workspace_id' })
    workspaceId: string;

    @ManyToMany(() => ProjectEntity, (project) => project.namespaces)
    @JoinTable({
        name: 'project_namespace',
        joinColumn: {
            name: 'namespace_id',
            referencedColumnName: 'id',
        },
        inverseJoinColumn: {
            name: 'project_id',
            referencedColumnName: 'id',
        },
    })
    projects: ProjectEntity[];

    @ManyToMany(() => WorkflowEntity, (workflow) => workflow.namespaces)
    @JoinTable({
        name: 'workflow_namespace',
        joinColumn: {
            name: 'namespace_id',
            referencedColumnName: 'id',
        },
        inverseJoinColumn: {
            name: 'workflow_id',
            referencedColumnName: 'id',
        },
    })
    workflows: WorkflowEntity[];
}