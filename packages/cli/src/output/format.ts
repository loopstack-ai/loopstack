import pc from 'picocolors';
import { WorkflowState } from '@loopstack/contracts/enums';

/** Plain-text table: padded columns, dimmed header, no borders. */
export function renderTable(headers: string[], rows: string[][], minWidths: number[] = []): string {
  const widths = headers.map((header, column) =>
    Math.max(minWidths[column] ?? 0, header.length, ...rows.map((row) => (row[column] ?? '').length)),
  );
  const renderRow = (cells: string[]) =>
    widths
      .map((width, column) => (cells[column] ?? '').padEnd(width))
      .join('  ')
      .trimEnd();
  return [pc.dim(renderRow(headers)), ...rows.map(renderRow)].join('\n');
}

/**
 * The run's published result in human mode. Object results render as one
 * `key: value` line per field — strings raw, everything else compact JSON.
 * String results render raw on a `result:` line; JSON stays in `--json`
 * mode. Empty results print nothing. Returns whether anything was written.
 */
export function renderResult(out: NodeJS.WritableStream, result: unknown): boolean {
  if (result == null) return false;
  if (typeof result === 'object' && !Array.isArray(result)) {
    let wrote = false;
    for (const [key, value] of Object.entries(result)) {
      if (value == null) continue;
      out.write(`${pc.dim(`${key}:`)}\n${typeof value === 'string' ? value : JSON.stringify(value)}\n`);
      wrote = true;
    }
    return wrote;
  }
  const text = typeof result === 'string' ? result : JSON.stringify(result);
  if (!text) return false;
  out.write(`${pc.dim('result:')}\n${text}\n`);
  return true;
}

export function colorStatus(status: string): string {
  switch (status) {
    case WorkflowState.Completed:
      return pc.green(status);
    case WorkflowState.Failed:
      return pc.red(status);
    case WorkflowState.Waiting:
    case WorkflowState.Paused:
      return pc.yellow(status);
    case WorkflowState.Running:
      return pc.cyan(status);
    default:
      return status;
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

/** Data goes to stdout (pipe-safe); everything else belongs on stderr. */
export function printData(text: string): void {
  console.log(text);
}

export function printStatus(text: string): void {
  console.error(text);
}
