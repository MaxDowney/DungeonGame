import type { MapDefinition, Position, Tile, Unit } from "../types";

export const posKey = (pos: Position): string => `${pos.x},${pos.y}`;

export const samePos = (a: Position, b: Position): boolean => a.x === b.x && a.y === b.y;

export const distance = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const getTile = (map: MapDefinition, pos: Position): Tile | undefined =>
  map.tiles.find((tile) => tile.x === pos.x && tile.y === pos.y);

export const isBlockedTile = (tile: Tile | undefined): boolean => {
  if (!tile) return true;
  if (tile.type === "void") return true;
  if (tile.type === "wall") return true;
  if (tile.type === "door" && !tile.open) return true;
  return false;
};

export const isOccupied = (pos: Position, units: Unit[], ignoreUnitId?: string): boolean =>
  units.some(
    (unit) =>
      unit.id !== ignoreUnitId &&
      !unit.defeated &&
      !unit.downed &&
      samePos(unit.position, pos),
  );

const occupyingUnit = (pos: Position, units: Unit[], ignoreUnitId?: string): Unit | undefined =>
  units.find(
    (unit) =>
      unit.id !== ignoreUnitId &&
      !unit.defeated &&
      !unit.downed &&
      samePos(unit.position, pos),
  );

export const tileMoveCost = (tile: Tile): number => (tile.type === "difficult" ? 2 : 1);

export const effectiveMovementAllowance = (unit: Unit, movement = unit.speed): number => {
  if (unit.conditions.some((condition) => condition.type === "Rooted")) return 0;
  const speedCap = unit.conditions.find((condition) => condition.type === "Slowed")?.value;
  return Math.max(0, speedCap ? Math.min(movement, speedCap) : movement);
};

export const neighbors = (pos: Position): Position[] => [
  { x: pos.x + 1, y: pos.y },
  { x: pos.x - 1, y: pos.y },
  { x: pos.x, y: pos.y + 1 },
  { x: pos.x, y: pos.y - 1 },
];

export const reachableTiles = (
  map: MapDefinition,
  unit: Unit,
  units: Unit[],
  movement = unit.speed,
): Position[] => {
  return reachableTileCosts(map, unit, units, movement).map((entry) => entry.position);
};

export const reachableTileCosts = (
  map: MapDefinition,
  unit: Unit,
  units: Unit[],
  movement = unit.speed,
  options: { applyMovementConditions?: boolean } = {},
): Array<{ position: Position; cost: number }> => {
  const budget = options.applyMovementConditions === false
    ? movement
    : effectiveMovementAllowance(unit, movement);
  if (budget <= 0) return [];
  const queue: Array<{ pos: Position; cost: number }> = [{ pos: unit.position, cost: 0 }];
  const seen = new Map<string, number>([[posKey(unit.position), 0]]);

  while (queue.length) {
    const current = queue.shift()!;
    for (const next of neighbors(current.pos)) {
      const tile = getTile(map, next);
      if (isBlockedTile(tile)) continue;
      const occupant = occupyingUnit(next, units, unit.id);
      if (occupant && occupant.side !== unit.side) continue;
      const nextCost = current.cost + tileMoveCost(tile!);
      if (nextCost > budget) continue;
      const key = posKey(next);
      if (seen.has(key) && seen.get(key)! <= nextCost) continue;
      seen.set(key, nextCost);
      queue.push({ pos: next, cost: nextCost });
    }
  }

  return Array.from(seen.entries())
    .filter(([key]) => key !== posKey(unit.position))
    .map(([key, cost]) => {
      const [x, y] = key.split(",").map(Number);
      return { position: { x, y }, cost };
    })
    .filter((entry) => !isOccupied(entry.position, units, unit.id));
};

export const multiMoveApCost = (
  map: MapDefinition,
  unit: Unit,
  units: Unit[],
  target: Position,
): number | undefined => {
  const allowance = effectiveMovementAllowance(unit, unit.speed);
  if (allowance <= 0 || unit.ap <= 0) return undefined;
  const budget = allowance * unit.ap;
  const entry = reachableTileCosts(map, unit, units, budget, { applyMovementConditions: false })
    .find((candidate) => samePos(candidate.position, target));
  if (!entry) return undefined;
  return Math.max(1, Math.ceil(entry.cost / allowance));
};

export const nearestUnit = (from: Unit, candidates: Unit[]): Unit | undefined =>
  candidates
    .filter((unit) => !unit.defeated && !unit.downed)
    .sort((a, b) => distance(from.position, a.position) - distance(from.position, b.position))[0];

export const stepToward = (
  map: MapDefinition,
  mover: Unit,
  target: Position,
  units: Unit[],
  maxSteps: number,
): Position => {
  const reachable = reachableTiles(map, mover, units, maxSteps);
  if (!reachable.length) return mover.position;
  return reachable.sort((a, b) => distance(a, target) - distance(b, target))[0];
};
