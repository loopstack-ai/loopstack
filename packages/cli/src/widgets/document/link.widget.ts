import pc from 'picocolors';
import type { DocumentWidget } from '../types.js';

/**
 * Sub-workflow links (from `show: 'inline' | 'link'`): a Studio deep link
 * when the environment has one, the workflow id otherwise. Attached to the
 * flow — no paragraph spacing.
 */
export const linkWidget: DocumentWidget = (content, ctx, out) => {
  const target = typeof content.workflowId === 'string' ? content.workflowId : undefined;
  if (!target) return;
  const label = typeof content.label === 'string' ? content.label : 'sub-workflow';
  out.line(pc.dim(`⧉ ${label}: ${ctx.studioUrl?.(target) ?? target}`));
};
