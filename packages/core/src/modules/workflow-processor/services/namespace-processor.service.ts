import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { NamespacesService } from '../../persistence';
import { NamespaceEntity, NamespacePropsType } from '@loopstack/shared';
import {
  BlockContextType,
  BlockInterface,
} from '../interfaces/block.interface';
import {
  FactoryExecutionContextDto,
  PipelineExecutionContextDto,
} from '../dtos';

@Injectable()
export class NamespaceProcessorService {
  private readonly logger = new Logger(NamespaceProcessorService.name);

  constructor(
    @Inject(forwardRef(() => NamespacesService))
    private namespacesService: NamespacesService,
  ) {}

  async createNamespace(
    block: BlockInterface,
    props: NamespacePropsType,
  ): Promise<NamespaceEntity> {
    return this.namespacesService.create({
      name: props.label ?? 'Group',
      pipelineId: block.ctx.pipelineId,
      workspaceId: block.ctx.workspaceId,
      parent: block.ctx.namespace,
      createdBy: block.ctx.userId,
    });
  }

  async cleanupNamespace(
    parentBlockCtx: PipelineExecutionContextDto | FactoryExecutionContextDto,
    validBlockContexts: BlockContextType[],
  ) {
    const newChildNamespaceIds = validBlockContexts
      .map((item) => item.namespace?.id)
      .filter((v) => !!v);
    const originalChildNamespaces =
      await this.namespacesService.getChildNamespaces(
        parentBlockCtx.namespace.id,
      );
    const danglingNamespaces = originalChildNamespaces.filter(
      (item) => !newChildNamespaceIds.includes(item.id),
    );
    if (danglingNamespaces.length) {
      await this.namespacesService.delete(danglingNamespaces);
      this.logger.debug(
        `Removed ${danglingNamespaces.length} dangling namespaces.`,
      );
    }
  }
}
