import { Injectable } from '@nestjs/common';

export interface ToolTraceEntry {
  toolName: string;
  workflowId: string;
  durationMs: number;
  success: boolean;
}

const MAX_ENTRIES = 100;

@Injectable()
export class ToolTraceService {
  private readonly entries: ToolTraceEntry[] = [];

  record(entry: ToolTraceEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }
  }

  forWorkflow(workflowId: string): ToolTraceEntry[] {
    return this.entries.filter((entry) => entry.workflowId === workflowId);
  }
}
