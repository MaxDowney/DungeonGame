import type { MapDefinition, Position } from "../types";
import { getTile, isBlockedTile, samePos } from "./movement";

const linePoints = (from: Position, to: Position): Position[] => {
  const points: Position[] = [];
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return points;
};

export const hasLineOfSight = (map: MapDefinition, from: Position, to: Position): boolean => {
  const points = linePoints(from, to).slice(1, -1);
  return points.every((point) => {
    if (samePos(point, from) || samePos(point, to)) return true;
    return !isBlockedTile(getTile(map, point));
  });
};
