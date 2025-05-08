import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../../common';
import { NamespacesService } from '../../persistence';
import { ContextInterface, NamespacePropsType } from '@loopstack/shared';

@Injectable()
export class NamespaceProcessorService {
  private readonly logger = new Logger(NamespaceProcessorService.name);
  stop: boolean = false;

  constructor(
    @Inject(forwardRef(() => ContextService))
    private contextService: ContextService,
    @Inject(forwardRef(() => NamespacesService))
    private namespacesService: NamespacesService,
  ) {}

  async createNamespace(context: ContextInterface, props: NamespacePropsType): Promise<ContextInterface> {
    let clone =  this.contextService.create(context);
    clone.namespace = await this.namespacesService.create({
      name: props.label ?? 'Group',
      model: context.model,
      projectId: context.projectId,
      workspaceId: context.workspaceId,
      parent: context.namespace,
      metadata: props.meta ?? {},
      createdBy: context.userId,
    });
    clone.labels.push(clone.namespace.name);

    return clone;
  }

  async cleanupNamespace(parentContext: ContextInterface, validContexts: ContextInterface[]) {
    const newChildNamespaceIds = validContexts.map((item) => item.namespace.id);
    const originalChildNamespaces = await this.namespacesService.getChildNamespaces(parentContext.namespace.id);
    const danglingNamespaces = originalChildNamespaces.filter((item) => !newChildNamespaceIds.includes(item.id));
    if (danglingNamespaces.length) {
      await this.namespacesService.delete(danglingNamespaces);
      this.logger.debug(`Removed ${danglingNamespaces.length} dangling namespaces.`);
    }
  }
}
