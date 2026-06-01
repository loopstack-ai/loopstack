import { Injectable, Logger } from '@nestjs/common';
import { DocumentEntity, WorkflowEntity } from '@loopstack/common';

export interface MemorySnapshot {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
}

export interface WorkflowMemoryMetrics {
  memory: MemorySnapshot;
  documentCount: number;
  invalidatedDocumentCount: number;
  version: number;
}

const HEAP_WARN_THRESHOLD_MB = 512;
const DOCUMENT_WARN_THRESHOLD = 100;

@Injectable()
export class WorkflowMemoryMonitorService {
  private readonly logger = new Logger(WorkflowMemoryMonitorService.name);

  getMemorySnapshot(): MemorySnapshot {
    const mem = process.memoryUsage();
    return {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
    };
  }

  collectMetrics(documents: DocumentEntity[], version: number): WorkflowMemoryMetrics {
    const memory = this.getMemorySnapshot();
    const documentCount = documents.length;
    const invalidatedDocumentCount = documents.filter((d) => d.isInvalidated).length;

    return {
      memory,
      documentCount,
      invalidatedDocumentCount,
      version,
    };
  }

  logTransition(workflowName: string, transitionId: string, documents: DocumentEntity[], version: number): void {
    const metrics = this.collectMetrics(documents, version);
    const { memory, documentCount, invalidatedDocumentCount } = metrics;

    this.logger.debug(
      `[${workflowName}] transition="${transitionId}" | ` +
        `heap=${memory.heapUsedMB}/${memory.heapTotalMB}MB rss=${memory.rssMB}MB | ` +
        `version=${version} | ` +
        `docs=${documentCount} (invalidated=${invalidatedDocumentCount})`,
    );

    if (memory.heapUsedMB > HEAP_WARN_THRESHOLD_MB) {
      this.logger.warn(
        `[${workflowName}] High heap usage: ${memory.heapUsedMB}MB (threshold: ${HEAP_WARN_THRESHOLD_MB}MB)`,
      );
    }

    if (documentCount > DOCUMENT_WARN_THRESHOLD) {
      this.logger.warn(
        `[${workflowName}] High document count: ${documentCount} (active=${documentCount - invalidatedDocumentCount}, invalidated=${invalidatedDocumentCount}, threshold: ${DOCUMENT_WARN_THRESHOLD})`,
      );
    }
  }

  logHeap(label: string): void {
    const memory = this.getMemorySnapshot();
    this.logger.log(
      `[${label}] heap=${memory.heapUsedMB}/${memory.heapTotalMB}MB rss=${memory.rssMB}MB external=${memory.externalMB}MB`,
    );

    if (memory.heapUsedMB > HEAP_WARN_THRESHOLD_MB) {
      this.logger.warn(`[${label}] High heap usage: ${memory.heapUsedMB}MB (threshold: ${HEAP_WARN_THRESHOLD_MB}MB)`);
    }
  }

  logWorkflowEntityLoaded(label: string, entity: WorkflowEntity): void {
    const memory = this.getMemorySnapshot();
    const documentCount = entity.documents?.length ?? 0;

    this.logger.log(
      `[${label}] entity=${entity.workflowName} id=${entity.id} | ` +
        `heap=${memory.heapUsedMB}/${memory.heapTotalMB}MB | ` +
        `docs=${documentCount}`,
    );

    if (documentCount > DOCUMENT_WARN_THRESHOLD) {
      this.logger.warn(
        `[${label}] entity=${entity.workflowName} has ${documentCount} documents (threshold: ${DOCUMENT_WARN_THRESHOLD})`,
      );
    }
  }

  logWorkflowStart(workflowName: string): void {
    const memory = this.getMemorySnapshot();
    this.logger.log(
      `[${workflowName}] START | heap=${memory.heapUsedMB}/${memory.heapTotalMB}MB rss=${memory.rssMB}MB`,
    );
  }

  logWorkflowEnd(workflowName: string, documents: DocumentEntity[], version: number): void {
    const metrics = this.collectMetrics(documents, version);
    const { memory, documentCount, invalidatedDocumentCount } = metrics;

    this.logger.log(
      `[${workflowName}] END | ` +
        `heap=${memory.heapUsedMB}/${memory.heapTotalMB}MB rss=${memory.rssMB}MB | ` +
        `version=${version} | ` +
        `docs=${documentCount} (invalidated=${invalidatedDocumentCount})`,
    );
  }
}
