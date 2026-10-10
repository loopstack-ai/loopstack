import { Injectable } from '@nestjs/common';

export interface AuditEntry {
  type: string;
  workflowId?: string;
  userId: string | null;
}

const MAX_ENTRIES = 200;

@Injectable()
export class AuditLogService {
  private readonly entries: AuditEntry[] = [];

  record(entry: AuditEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }
  }

  forWorkflow(workflowId: string): AuditEntry[] {
    return this.entries.filter((entry) => entry.workflowId === workflowId);
  }
}
