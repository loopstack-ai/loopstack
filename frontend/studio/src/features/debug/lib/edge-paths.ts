import { Position, getSmoothStepPath } from '@xyflow/react';
import type { EdgePathInput, EdgePathResult } from './flow-types.ts';

const SELF_LOOP_OFFSET = 75;
const SELF_LOOP_EXTEND = 20;
const SELF_LOOP_NODE_W = 130;
const SELF_LOOP_NODE_H = 70;

export function selfLoopPath(sourceX: number, sourceY: number, sourcePosition: Position): EdgePathResult {
  const isVertical = sourcePosition === Position.Bottom || sourcePosition === Position.Top;

  if (isVertical) {
    const tx = sourceX;
    const ty = sourceY - SELF_LOOP_NODE_H;
    return {
      path: `M ${sourceX} ${sourceY} C ${sourceX + SELF_LOOP_OFFSET} ${sourceY + SELF_LOOP_EXTEND}, ${tx + SELF_LOOP_OFFSET} ${ty - SELF_LOOP_EXTEND}, ${tx} ${ty}`,
      labelX: sourceX + SELF_LOOP_OFFSET + 8,
      labelY: (sourceY + ty) / 2,
    };
  }

  const tx = sourceX - SELF_LOOP_NODE_W;
  const ty = sourceY;
  return {
    path: `M ${sourceX} ${sourceY} C ${sourceX + SELF_LOOP_EXTEND} ${sourceY + SELF_LOOP_OFFSET}, ${tx - SELF_LOOP_EXTEND} ${ty + SELF_LOOP_OFFSET}, ${tx} ${ty}`,
    labelX: (sourceX + tx) / 2,
    labelY: sourceY + SELF_LOOP_OFFSET + 8,
  };
}

const BACK_EDGE_MIN_OFFSET = 60;

export function backEdgePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
): EdgePathResult {
  const isBottom = sourcePosition === Position.Bottom;

  if (isBottom) {
    const dx = Math.abs(sourceX - targetX);
    const offset = Math.max(dx * 0.3, BACK_EDGE_MIN_OFFSET);
    return {
      path: `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + offset}, ${targetX} ${targetY + offset}, ${targetX} ${targetY}`,
      labelX: (sourceX + targetX) / 2,
      labelY: Math.max(sourceY, targetY) + offset + 10,
    };
  }

  const dy = Math.abs(sourceY - targetY);
  const offset = Math.max(dy * 0.3, BACK_EDGE_MIN_OFFSET);
  return {
    path: `M ${sourceX} ${sourceY} C ${sourceX + offset} ${sourceY}, ${targetX + offset} ${targetY}, ${targetX} ${targetY}`,
    labelX: Math.max(sourceX, targetX) + offset + 10,
    labelY: (sourceY + targetY) / 2,
  };
}

export function forwardEdgePath(input: EdgePathInput): EdgePathResult {
  const [path, labelX, labelY] = getSmoothStepPath(input);
  return { path, labelX, labelY };
}

export function resolveEdgePath(
  input: EdgePathInput,
  flags: { isSelfLoop?: boolean; isBackEdge?: boolean },
): EdgePathResult {
  if (flags.isSelfLoop) {
    return selfLoopPath(input.sourceX, input.sourceY, input.sourcePosition);
  }
  if (flags.isBackEdge) {
    return backEdgePath(input.sourceX, input.sourceY, input.targetX, input.targetY, input.sourcePosition);
  }
  return forwardEdgePath(input);
}
