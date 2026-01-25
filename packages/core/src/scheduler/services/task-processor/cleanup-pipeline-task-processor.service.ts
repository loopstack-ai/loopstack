import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CleanupPipelineTaskProcessorService {
  private readonly logger = new Logger(CleanupPipelineTaskProcessorService.name);

  // constructor(
  //   private readonly configurationService: ConfigurationService,
  //   private readonly pipelineService: PipelineService,
  // ) {}
  //
  // public async process(
  //   task: CleanupPipelineTask,
  //   metadata?: ConfigElementMetadata,
  // ) {
  //   const { payload } = task;
  //   const pipelineConfig =
  //     this.configurationService.resolveConfig<PipelineRootType>(
  //       'pipelines',
  //       task.payload.pipeline,
  //       metadata?.includes ?? [],
  //     );
  //   const pipelineName = `${pipelineConfig.path}:${pipelineConfig.name}`;
  //
  //   this.logger.debug(
  //     `Starting pipeline cleanup for pipeline: ${pipelineName}`,
  //   );
  //
  //   let queryBuilder = this.createBaseQuery(pipelineName, payload, task.user);
  //
  //   const totalFound = await queryBuilder.getCount();
  //   if (totalFound === 0) {
  //     this.logger.debug('No pipelines found matching cleanup criteria');
  //     return;
  //   }
  //
  //   if (payload.skip && payload.skip > 0) {
  //     queryBuilder.skip(payload.skip);
  //   }
  //
  //   if (payload.limit && payload.limit > 0) {
  //     queryBuilder.limit(payload.limit);
  //   }
  //
  //   const pipelinesToDelete = await queryBuilder.getMany();
  //   if (pipelinesToDelete.length === 0) {
  //     this.logger.debug(
  //       'No pipelines to delete after applying keep/limit filters',
  //     );
  //     return;
  //   }
  //
  //   const pipelineIds = pipelinesToDelete.map((p) => p.id);
  //
  //   const deleteResult = await this.pipelineService
  //     .getRepository()
  //     .delete(pipelineIds);
  //   const deletedCount = deleteResult.affected || 0;
  //
  //   this.logger.log(
  //     `Pipeline cleanup completed. Deleted: ${deletedCount}, Total found: ${totalFound}`,
  //   );
  // }
  //
  // /**
  //  * Create the base query with common filters
  //  */
  // private createBaseQuery(
  //   name: string,
  //   payload: CleanupPipelineTask['payload'],
  //   user: string | null,
  // ): SelectQueryBuilder<PipelineEntity> {
  //   let queryBuilder = this.pipelineService
  //     .getRepository()
  //     .createQueryBuilder('pipeline')
  //     .where('pipeline.model = :pipeline', { pipeline: name });
  //
  //   if (null === user) {
  //     queryBuilder.andWhere('pipeline.created_by IS NULL');
  //   } else {
  //     queryBuilder.andWhere('pipeline.created_by = :user', { user });
  //   }
  //
  //   if (payload.status) {
  //     queryBuilder.andWhere('pipeline.status = :status', {
  //       status: payload.status,
  //     });
  //   }
  //
  //   if (payload.olderThan) {
  //     queryBuilder.andWhere(
  //       `pipeline.created_at < NOW() - INTERVAL '${payload.olderThan}'`,
  //     );
  //   }
  //
  //   queryBuilder.orderBy('pipeline.updated_at', 'DESC');
  //
  //   return queryBuilder;
  // }
}
