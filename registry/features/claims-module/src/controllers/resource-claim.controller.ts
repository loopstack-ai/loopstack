import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { CurrentUser, type CurrentUserInterface } from '@loopstack/common';
import { WorkspaceService } from '@loopstack/core';
import type { ClaimHolder } from '../interfaces/index.js';
import { ResourceClaimService } from '../services/index.js';

/**
 * Read-only: what a workspace holds right now. Enough to answer "why has nothing started" without running a
 * workflow to ask. Claims are taken and released by workflows, never over HTTP.
 */
@Controller('api/v1/workspaces/:workspaceId/claims')
export class ResourceClaimController {
  constructor(
    private readonly claims: ResourceClaimService,
    private readonly workspaces: WorkspaceService,
  ) {}

  @Get()
  async getClaims(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<ClaimHolder[]> {
    const workspace = await this.workspaces.getWorkspace({ id: workspaceId }, user.userId);
    if (!workspace) throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    return this.claims.heldBy({ workspaceId });
  }
}
