import type { MapDefinition, TileType } from "../types";

const CUSTOM_MAPS_KEY = "dungeon-threat:custom-maps";

const tileTypes: TileType[] = [
  "void",
  "floor",
  "wall",
  "door",
  "trap",
  "difficult",
  "altar",
  "exit",
  "objective",
  "portal",
  "anchor",
];

const isTileType = (value: unknown): value is TileType =>
  typeof value === "string" && tileTypes.includes(value as TileType);

export const loadCustomMaps = (): MapDefinition[] => {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(CUSTOM_MAPS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUsableMap);
  } catch {
    return [];
  }
};

export const findCustomMap = (mapId: string): MapDefinition | undefined =>
  loadCustomMaps().find((map) => map.id === mapId);

export const saveCustomMap = (map: MapDefinition): MapDefinition[] => {
  const maps = loadCustomMaps();
  const next = [map, ...maps.filter((item) => item.id !== map.id)].slice(0, 24);
  localStorage.setItem(CUSTOM_MAPS_KEY, JSON.stringify(next));
  return next;
};

export const deleteCustomMap = (mapId: string): MapDefinition[] => {
  const next = loadCustomMaps().filter((map) => map.id !== mapId);
  localStorage.setItem(CUSTOM_MAPS_KEY, JSON.stringify(next));
  return next;
};

export const customMapStorageKey = CUSTOM_MAPS_KEY;

const isUsableMap = (value: unknown): value is MapDefinition => {
  const map = value as Partial<MapDefinition>;
  if (!map || typeof map !== "object") return false;
  if (!map.id || !map.name || !map.size || !Array.isArray(map.tiles)) return false;
  if (!Number.isFinite(map.size.width) || !Number.isFinite(map.size.height)) return false;
  if (!Array.isArray(map.heroStarts) || map.heroStarts.length === 0) return false;
  if (!Array.isArray(map.monsters) || !Array.isArray(map.rooms)) return false;
  if (!map.objective || typeof map.objective.hero !== "string") return false;
  return map.tiles.every((tile) =>
    Number.isFinite(tile.x) &&
    Number.isFinite(tile.y) &&
    isTileType(tile.type),
  );
};
