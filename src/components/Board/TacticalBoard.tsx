import { motion } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent,
} from "react";
import { UnitToken } from "../Tokens/UnitToken";
import {
  selectAllUnits,
  selectCurrentMap,
  selectReachablePositions,
  selectValidTargetIds,
  useGameStore,
} from "../../game/state/store";
import { posKey, samePos } from "../../game/engine/movement";
import type { Position, Tile, Unit } from "../../game/types";

const tileTitle = (tile: Tile) =>
  !tile.revealed
    ? "Unexplored room"
    : tile.label
      ? `${tile.label} (${tile.type})`
      : tile.type.replace("-", " ");

const tileTooltip = (tile: Tile): string => {
  if (!tile.revealed) return "Unexplored: this room or corridor is hidden until a hero enters or opens the way.";
  const name = tile.label ? `${tile.label}: ` : "";
  const text: Record<string, string> = {
    floor: "Floor: normal walkable tile.",
    door: tile.open ? "Open Door: movement can pass through." : "Closed Door: interact adjacent to open it.",
    trap: "Trap: dangerous tile. Heroes may lose AP or trigger dungeon effects.",
    difficult: "Difficult Terrain: movement may be slowed by future rules.",
    altar: "Altar Objective: interact to claim or activate the map objective.",
    objective: "Objective: interact or stand here when the map rules require it.",
    exit: "Exit: bring the relic carrier here and interact/escape as required.",
    portal: "Portal Objective: scenario threat source.",
    anchor: "Anchor Objective: interact to seal it.",
  };
  return `${name}${text[tile.type] ?? tile.type}`;
};

const canShowTileSurface = (tile: Tile): boolean => tile.type !== "void" && tile.type !== "wall";

export function TacticalBoard() {
  const mapState = useGameStore((state) => state.mapState);
  const boardClick = useGameStore((state) => state.boardClick);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panDrag = useRef<{ x: number; y: number } | null>(null);

  const map = selectCurrentMap(mapState);
  const units = selectAllUnits(mapState);
  const reachable = selectReachablePositions(mapState).map(posKey);
  const targetIds = new Set(selectValidTargetIds(mapState));
  const selectedId = mapState?.selectedUnitId;
  const activeId = mapState?.activeUnitId;
  const selectedCardId = mapState?.selectedCardId;
  const selectedActionId = mapState?.selectedMonsterActionId;
  const selectedDmCardId = mapState?.selectedDmCardId;

  const tileForPosition = (position: Position): Tile | undefined =>
    map.tiles.find((tile) => samePos(tile, position));

  const isPlayableSurface = (position: Position): boolean => {
    const tile = tileForPosition(position);
    return Boolean(tile && canShowTileSurface(tile));
  };

  const edgeClasses = (tile: Tile): string => {
    if (!canShowTileSurface(tile)) return "";
    const edges = [
      !isPlayableSurface({ x: tile.x, y: tile.y - 1 }) ? "edge-n" : "",
      !isPlayableSurface({ x: tile.x + 1, y: tile.y }) ? "edge-e" : "",
      !isPlayableSurface({ x: tile.x, y: tile.y + 1 }) ? "edge-s" : "",
      !isPlayableSurface({ x: tile.x - 1, y: tile.y }) ? "edge-w" : "",
    ];
    return edges.filter(Boolean).join(" ");
  };

  const unitForTile = (position: Position): Unit | undefined => {
    const tile = tileForPosition(position);
    if (!tile?.revealed || !canShowTileSurface(tile)) return undefined;
    return units.find((unit) => !unit.defeated && samePos(unit.position, position));
  };

  const tethers = mapState?.monsters
    .filter((monster) => {
      const tile = tileForPosition(monster.position);
      return !monster.defeated && tile?.revealed && monster.agro?.currentTargetId;
    })
    .map((monster) => {
      const target = mapState.heroes.find((hero) => hero.id === monster.agro?.currentTargetId);
      return target ? { monster, target } : null;
    })
    .filter(Boolean) as Array<{ monster: Unit; target: Unit }>;

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((value) => Math.max(0.72, Math.min(1.8, value + (event.deltaY < 0 ? 0.1 : -0.1))));
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 1) return;
    event.preventDefault();
    panDrag.current = { x: event.clientX, y: event.clientY };
    setPanning(true);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!panDrag.current) return;
      event.preventDefault();
      const dx = event.clientX - panDrag.current.x;
      const dy = event.clientY - panDrag.current.y;
      panDrag.current = { x: event.clientX, y: event.clientY };
      setPan((value) => ({ x: value.x + dx, y: value.y + dy }));
    };

    const handleMouseUp = () => {
      if (!panDrag.current) return;
      panDrag.current = null;
      setPanning(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      className={`board-wrap ${panning ? "panning" : ""}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onAuxClick={(event) => event.preventDefault()}
      style={
        {
          "--board-w": map.size.width,
          "--board-h": map.size.height,
          "--board-zoom": zoom,
          "--board-pan-x": `${pan.x}px`,
          "--board-pan-y": `${pan.y}px`,
        } as CSSProperties
      }
    >
      <div className="board-zoom-readout">{Math.round(zoom * 100)}%</div>
      <div className="board-scene">
        <svg className="target-tethers" viewBox={`0 0 ${map.size.width} ${map.size.height}`} preserveAspectRatio="none">
          {tethers?.map(({ monster, target }) => (
            <motion.line
              key={`${monster.id}-${target.id}`}
              x1={monster.position.x + 0.5}
              y1={monster.position.y + 0.5}
              x2={target.position.x + 0.5}
              y2={target.position.y + 0.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.9 }}
              stroke="rgba(255, 84, 84, .75)"
              strokeWidth="0.045"
              strokeDasharray="0.16 0.1"
            />
          ))}
        </svg>
        <div className="board-grid">
          {map.tiles.map((tile) => {
            const key = posKey(tile);
            const unit = unitForTile(tile);
            const isReachable = reachable.includes(key);
            const isTarget = unit ? targetIds.has(unit.id) : false;
            const selected = unit?.id === selectedId;
            const active = unit?.id === activeId;
            const visibleType = canShowTileSurface(tile) ? (tile.revealed ? tile.type : "unrevealed") : "void";
            const tileShape = tile.room ? "room-tile" : tile.type === "floor" ? "corridor-tile" : "";
            return (
              <button
                key={key}
                type="button"
                title={tileTitle(tile)}
                data-tooltip={tileTooltip(tile)}
                onClick={() => canShowTileSurface(tile) && boardClick(tile)}
                className={`board-tile ${visibleType} ${tileShape} ${edgeClasses(tile)} ${tile.open ? "open" : ""} ${isReachable ? "reachable" : ""} ${
                  isTarget ? "targetable" : ""
                } ${active ? "active-unit-tile" : ""} ${selectedCardId || selectedActionId || selectedDmCardId ? "intent" : ""}`}
              >
                <span className="tile-glow" />
                {tile.revealed && ["altar", "objective", "portal", "anchor", "exit"].includes(tile.type) && (
                  <span className="objective-pulse" />
                )}
                {unit && (
                  <UnitToken
                    unit={unit}
                    selected={selected}
                    active={active}
                    validTarget={isTarget}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="floating-layer">
          {mapState?.floatingText.map((float) => (
            <motion.div
              key={float.id}
              className={`floating-text ${float.tone}`}
              initial={{ y: 0, opacity: 0, scale: 0.8 }}
              animate={{ y: -38, opacity: [0, 1, 1, 0], scale: [0.8, 1, 1] }}
              transition={{ duration: 1.35 }}
              style={{
                left: `${((float.position.x + 0.5) / map.size.width) * 100}%`,
                top: `${((float.position.y + 0.25) / map.size.height) * 100}%`,
              }}
            >
              {float.text}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
