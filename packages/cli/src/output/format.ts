import pc from 'picocolors';
import { WorkflowState } from '@loopstack/contracts/enums';

/** Plain-text table: padded columns, dimmed header, no borders. */
export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => (row[column] ?? '').length)),
  );
  const renderRow = (cells: string[]) =>
    widths
      .map((width, column) => (cells[column] ?? '').padEnd(width))
      .join('  ')
      .trimEnd();
  return [pc.dim(renderRow(headers)), ...rows.map(renderRow)].join('\n');
}

/**
 * The run's published result in human mode — compact on one line when it
 * fits, pretty-printed otherwise. Empty results print nothing.
 */
export function renderResult(out: NodeJS.WritableStream, result: unknown): void {
  if (result == null) return;
  const compact = JSON.stringify(result);
  if (!compact || compact === '{}' || compact === '[]') return;
  out.write(`${pc.dim('result:')} ${compact.length <= 100 ? compact : JSON.stringify(result, null, 2)}\n`);
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
