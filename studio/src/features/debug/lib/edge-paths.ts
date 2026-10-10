import { Position, getSmoothStepPath } from '@xyflow/react';
import { NODE_HEIGHT, NODE_WIDTH } from './flow-types.ts';
import type { EdgePathInput, EdgePathResult } from './flow-types.ts';

const CLEAR = 22;
const HALF_W = NODE_WIDTH / 2;
const HALF_H = NODE_HEIGHT / 2;

export function selfLoopPath(input: EdgePathInput): EdgePathResult {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = input;

  if (sourcePosition === Position.Bottom && targetPosition === Position.Top) {
    return tbSelfLoopRight(sourceX, sourceY, targetX, targetY);
  }

  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    return lrSelfLoopBelow(sourceX, sourceY, targetX, targetY);
  }

  const [path, labelX, labelY] = getSmoothStepPath({
    ...input,
    borderRadius: 14,
  });
  return { path, labelX, labelY };
}

function tbSelfLoopRight(sx: number, sy: number, tx: number, ty: number): EdgePathResult {
  const pad = 16;
  const cx = (sx + tx) / 2;
  const xR = cx + HALF_W + CLEAR;
  const yLeave = sy + pad;
  const yHigh = ty - Math.max(pad, 28);
  const path = [
    `M ${sx} ${sy}`,
    `L ${sx} ${yLeave}`,
    `L ${xR} ${yLeave}`,
    `L ${xR} ${yHigh}`,
    `L ${tx} ${yHigh}`,
    `L ${tx} ${ty}`,
  ].join(' ');
  const labelX = xR + 14;
  const labelY = (yLeave + yHigh) / 2;
  return { path, labelX, labelY };
}

function lrSelfLoopBelow(sx: number, sy: number, tx: number, ty: number): EdgePathResult {
  const pad = 16;
  const cy = (sy + ty) / 2;
  const yB = cy + HALF_H + CLEAR;
  const xLeave = sx + pad;
  const xApproach = tx - pad;
  const path = [
    `M ${sx} ${sy}`,
    `L ${xLeave} ${sy}`,
    `L ${xLeave} ${yB}`,
    `L ${xApproach} ${yB}`,
    `L ${xApproach} ${ty}`,
    `L ${tx} ${ty}`,
  ].join(' ');
  const labelX = (xLeave + xApproach) / 2;
  const labelY = yB + 18;
  return { path, labelX, labelY };
}

export function forwardEdgePath(input: EdgePathInput): EdgePathResult {
  const [path, labelX, labelY] = getSmoothStepPath({
    ...input,
    borderRadius: 14,
  });
  return { path, labelX, labelY };
}

export function resolveEdgePath(input: EdgePathInput, flags: { isSelfLoop?: boolean }): EdgePathResult {
  if (flags.isSelfLoop) {
    return selfLoopPath(input);
  }
  return forwardEdgePath(input);
}
