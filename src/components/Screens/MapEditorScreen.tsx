import {
  DoorOpen,
  Download,
  Eraser,
  Flag,
  Grid3X3,
  Home,
  Map as MapIcon,
  Play,
  Save,
  Skull,
  Sparkles,
  Trash2,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { deleteCustomMap, loadCustomMaps, saveCustomMap } from "../../game/data/customMaps";
import { monsterTemplateById } from "../../game/data/monsters";
import { useGameStore } from "../../game/state/store";
import type { MapDefinition, Position, RoomDefinition, Tile, TileType } from "../../game/types";

type Brush =
  | "room"
  | "corridor"
  | "door"
  | "trap"
  | "difficult"
  | "altar"
  | "exit"
  | "objective"
  | "portal"
  | "anchor"
  | "hero"
  | "ogre-brute"
  | "cult-priest"
  | "demon-hound"
  | "erase";

interface EditorMonster {
  id: string;
  templateId: "ogre-brute" | "cult-priest" | "demon-hound";
  position: Position;
}

type EditorCell = Pick<Tile, "x" | "y" | "type" | "room" | "label" | "open">;

const width = 20;
const height = 16;

const defaultRooms: RoomDefinition[] = [
  {
    id: "room-a",
    name: "Threshold Hall",
    description:
      "The first chamber opens beneath cracked stone ribs. Old wax gutters beside boot prints leading into the dark.",
  },
  {
    id: "room-b",
    name: "Ossuary Vault",
    description:
      "Bone shelves climb the walls, each skull marked with ash. Something has been counting them in fresh scratches.",
  },
  {
    id: "room-c",
    name: "Flooded Gallery",
    description:
      "Cold water laps over black tiles. The reflections move a heartbeat after the heroes do.",
  },
  {
    id: "room-d",
    name: "Infernal Chapel",
    description:
      "A scorched altar smokes at the far end. The air tastes of iron and burned incense.",
  },
];

const roomGlyph: Record<string, string> = {
  "room-a": "A",
  "room-b": "B",
  "room-c": "C",
  "room-d": "D",
};

const brushLabel: Record<Brush, string> = {
  room: "Room",
  corridor: "Corridor",
  door: "Door",
  trap: "Trap",
  difficult: "Difficult",
  altar: "Altar",
  exit: "Exit",
  objective: "Objective",
  portal: "Portal",
  anchor: "Anchor",
  hero: "Hero Start",
  "ogre-brute": "Ogre",
  "cult-priest": "Priest",
  "demon-hound": "Hound",
  erase: "Erase",
};

const tileLabels: Partial<Record<TileType, string>> = {
  door: "Closed Door",
  trap: "Threat Trap",
  difficult: "Broken Ground",
  altar: "Dark Altar",
  exit: "Exit",
  objective: "Objective",
  portal: "Portal",
  anchor: "Seal Anchor",
};

const makeCell = (x: number, y: number, type: TileType = "void", room?: string): EditorCell => ({
  x,
  y,
  type,
  room,
});

const makeEmptyCells = () =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => makeCell(x, y)),
  ).flat();

const templateRows = [
  "____________________",
  "_AAAAAA_____BBBBBB__",
  "_AAAAAA_____BBBBBB__",
  "_AAAAAA.d...dBBBBB__",
  "_AAAAAA_____BBBBBB__",
  "____..______________",
  "____..______________",
  "_CCCCCC_____DDDDDD__",
  "_CCCCCC_____DDDDDD__",
  "_CCCCCd.....dDDDDD__",
  "_CCCCCC_____DDDDDD__",
  "_CCCCCC_____DDDDDD__",
  "____________________",
  "____________________",
  "____________________",
  "____________________",
];

const makeTemplateCells = (): EditorCell[] =>
  templateRows
    .flatMap((row, y) =>
      [...row].map((glyph, x) => {
        if (glyph === "_") return makeCell(x, y, "void");
        if (glyph === ".") return makeCell(x, y, "floor");
        if (glyph === "d") return { ...makeCell(x, y, "door"), label: "Closed Door", open: false };
        const room = Object.entries(roomGlyph).find(([, value]) => value === glyph)?.[0];
        return makeCell(x, y, "floor", room);
      }),
    );

const defaultHeroStarts: Position[] = [
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 3 },
];

const defaultMonsters: EditorMonster[] = [
  { id: "custom-ogre-1", templateId: "ogre-brute", position: { x: 15, y: 9 } },
  { id: "custom-priest-1", templateId: "cult-priest", position: { x: 15, y: 2 } },
];

const isSurface = (cell: EditorCell) => cell.type !== "void" && cell.type !== "wall";

const posKey = (position: Position) => `${position.x},${position.y}`;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "custom-map";

const brushes: Array<{ id: Brush; icon: LucideIcon }> = [
  { id: "room", icon: Grid3X3 },
  { id: "corridor", icon: MapIcon },
  { id: "door", icon: DoorOpen },
  { id: "trap", icon: Sparkles },
  { id: "difficult", icon: Grid3X3 },
  { id: "altar", icon: Sparkles },
  { id: "exit", icon: Flag },
  { id: "objective", icon: Flag },
  { id: "portal", icon: Sparkles },
  { id: "anchor", icon: Flag },
  { id: "hero", icon: Users },
  { id: "ogre-brute", icon: Skull },
  { id: "cult-priest", icon: Skull },
  { id: "demon-hound", icon: Skull },
  { id: "erase", icon: Trash2 },
];

export function MapEditorScreen() {
  const setScreen = useGameStore((state) => state.setScreen);
  const startCustomMap = useGameStore((state) => state.startCustomMap);
  const [mapId, setMapId] = useState(() => `custom-${crypto.randomUUID()}`);
  const [mapName, setMapName] = useState("The Unwritten Depths");
  const [subtitle, setSubtitle] = useState("A custom dungeon of four rooms, crooked corridors, and hungry shadows.");
  const [rooms, setRooms] = useState<RoomDefinition[]>(defaultRooms);
  const [cells, setCells] = useState<EditorCell[]>(makeTemplateCells);
  const [heroStarts, setHeroStarts] = useState<Position[]>(defaultHeroStarts);
  const [activeHeroSlot, setActiveHeroSlot] = useState(0);
  const [monsters, setMonsters] = useState<EditorMonster[]>(defaultMonsters);
  const [brush, setBrush] = useState<Brush>("room");
  const [activeRoomId, setActiveRoomId] = useState(defaultRooms[0].id);
  const [objectiveType, setObjectiveType] = useState<MapDefinition["objective"]["type"]>("defeatBoss");
  const [savedMaps, setSavedMaps] = useState<MapDefinition[]>(() => loadCustomMaps());
  const [painting, setPainting] = useState(false);
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const heroStartKeys = useMemo(() => new Map(heroStarts.map((position, index) => [posKey(position), index])), [heroStarts]);
  const monsterByKey = useMemo(() => new Map(monsters.map((monster) => [posKey(monster.position), monster])), [monsters]);

  const paintCell = (x: number, y: number) => {
    if (brush === "hero") {
      const position = { x, y };
      setCells((current) => current.map((cell) => (cell.x === x && cell.y === y && !isSurface(cell) ? { ...cell, type: "floor" } : cell)));
      setHeroStarts((current) => {
        const next = [...current];
        next[activeHeroSlot] = position;
        return next;
      });
      setActiveHeroSlot((slot) => (slot + 1) % 4);
      return;
    }

    if (["ogre-brute", "cult-priest", "demon-hound"].includes(brush)) {
      const templateId = brush as EditorMonster["templateId"];
      setCells((current) => current.map((cell) => (cell.x === x && cell.y === y && !isSurface(cell) ? { ...cell, type: "floor" } : cell)));
      setMonsters((current) => {
        const existing = current.find((monster) => monster.position.x === x && monster.position.y === y);
        if (existing) return current.filter((monster) => monster.id !== existing.id);
        return [
          ...current,
          {
            id: `${templateId}-${crypto.randomUUID().slice(0, 8)}`,
            templateId,
            position: { x, y },
          },
        ];
      });
      return;
    }

    setCells((current) =>
      current.map((cell) => {
        if (cell.x !== x || cell.y !== y) return cell;
        if (brush === "erase") return makeCell(x, y, "void");
        if (brush === "room") return makeCell(x, y, "floor", activeRoomId);
        if (brush === "corridor") return makeCell(x, y, "floor");
        const type = brush as TileType;
        return {
          ...makeCell(x, y, type, type === "door" ? undefined : activeRoomId),
          label: tileLabels[type],
          open: type === "door" ? false : undefined,
        };
      }),
    );
  };

  const buildMap = (): MapDefinition => {
    const surfaceCells = cells.filter(isSurface);
    const cellByKey = new Map(cells.map((cell) => [posKey(cell), cell]));
    const fallbackStarts = surfaceCells.slice(0, 4).map(({ x, y }) => ({ x, y }));
    const starts = Array.from({ length: 4 }, (_, index) => {
      const requested = heroStarts[index];
      const requestedCell = requested ? cellByKey.get(posKey(requested)) : undefined;
      return requested && requestedCell && isSurface(requestedCell)
        ? requested
        : fallbackStarts[index] ?? { x: 0, y: 0 };
    });
    const cleanRooms = rooms.map((room, index) => ({
      ...room,
      id: room.id || `room-${index + 1}`,
      name: room.name || `Room ${index + 1}`,
      description: room.description || "The chamber waits in cold shadow.",
    }));

    return {
      id: mapId.startsWith("custom-") ? mapId : `custom-${slugify(mapName)}`,
      name: mapName || "Custom Dungeon",
      subtitle,
      size: { width, height },
      rooms: cleanRooms,
      tiles: cells.map((cell) => ({
        x: cell.x,
        y: cell.y,
        type: cell.type,
        room: cell.room,
        label: cell.label,
        open: cell.open,
        revealed: true,
      })),
      heroStarts: starts.slice(0, 4),
      monsters: monsters.map((monster) => ({
        id: monster.id,
        templateId: monster.templateId,
        position: monster.position,
        objectiveMonster: objectiveType === "defeatBoss" && monster.templateId === "ogre-brute",
      })),
      objective: {
        hero:
          objectiveType === "defeatBoss"
            ? "Defeat the dungeon boss."
            : objectiveType === "relicToExit"
              ? "Recover the relic and carry it to the exit."
              : "Seal three anchors before the portal overwhelms the party.",
        dm:
          objectiveType === "defeatBoss"
            ? "Down heroes 3 total times."
            : objectiveType === "relicToExit"
              ? "Complete the ritual track."
              : "Keep the portal open for 8 rounds.",
        type: objectiveType,
        required: objectiveType === "sealAnchors" ? 3 : objectiveType === "relicToExit" ? 4 : 1,
        roundLimit: objectiveType === "sealAnchors" ? 8 : undefined,
      },
      escalation: objectiveType === "defeatBoss" ? undefined : {
        max: objectiveType === "relicToExit" ? 4 : 8,
        label: objectiveType === "relicToExit" ? "Ritual" : "Portal",
      },
    };
  };

  const saveMap = () => {
    const map = buildMap();
    setMapId(map.id);
    setSavedMaps(saveCustomMap(map));
    setExportText(JSON.stringify(map, null, 2));
  };

  const playtest = () => {
    const map = buildMap();
    saveCustomMap(map);
    startCustomMap(map);
  };

  const loadMap = (map: MapDefinition) => {
    setMapId(map.id);
    setMapName(map.name);
    setSubtitle(map.subtitle);
    setRooms(map.rooms.length ? map.rooms : defaultRooms);
    setCells(map.tiles.map((tile) => ({ ...tile })));
    setHeroStarts(map.heroStarts);
    setMonsters(
      map.monsters
        .filter((monster) => ["ogre-brute", "cult-priest", "demon-hound"].includes(monster.templateId))
        .map((monster) => ({
          id: monster.id,
          templateId: monster.templateId as EditorMonster["templateId"],
          position: monster.position,
        })),
    );
    setObjectiveType(map.objective.type);
    setExportText(JSON.stringify(map, null, 2));
  };

  const importMap = () => {
    try {
      const parsed = JSON.parse(importText) as MapDefinition;
      if (!parsed.tiles || !parsed.heroStarts) return;
      loadMap({ ...parsed, id: parsed.id.startsWith("custom-") ? parsed.id : `custom-${slugify(parsed.id)}` });
    } catch {
      setExportText("Import failed. Check the JSON and try again.");
    }
  };

  return (
    <section className="map-editor-screen h-full overflow-hidden px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Forge Mode</div>
          <h2 className="font-display text-4xl font-black text-amber-100">Map Editor</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button compact" onClick={() => setScreen("title")}>
            <Home size={16} />
            Title
          </button>
          <button className="secondary-button compact" onClick={saveMap}>
            <Save size={16} />
            Save
          </button>
          <button className="primary-button compact" onClick={playtest}>
            <Play size={16} />
            Playtest
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100%-5.5rem)] gap-4 xl:grid-cols-[19rem_1fr_21rem]">
        <aside className="panel map-editor-panel p-4">
          <label className="editor-field">
            <span>Map Name</span>
            <input value={mapName} onChange={(event) => setMapName(event.target.value)} />
          </label>
          <label className="editor-field">
            <span>Subtitle</span>
            <textarea value={subtitle} onChange={(event) => setSubtitle(event.target.value)} rows={3} />
          </label>
          <label className="editor-field">
            <span>Objective</span>
            <select value={objectiveType} onChange={(event) => setObjectiveType(event.target.value as MapDefinition["objective"]["type"])}>
              <option value="defeatBoss">Defeat Boss</option>
              <option value="relicToExit">Relic To Exit</option>
              <option value="sealAnchors">Seal Anchors</option>
            </select>
          </label>

          <div className="mt-4">
            <div className="eyebrow mb-2">Rooms</div>
            <div className="grid gap-2">
              {rooms.map((room, index) => (
                <button
                  key={room.id}
                  className={`room-picker ${activeRoomId === room.id ? "active" : ""}`}
                  onClick={() => setActiveRoomId(room.id)}
                  data-tooltip={`${room.name}: ${room.description}`}
                >
                  <strong>{roomGlyph[room.id] ?? index + 1}</strong>
                  <span>{room.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {rooms.map((room, index) => (
              <details key={room.id} className="room-copy-editor">
                <summary>{roomGlyph[room.id] ?? index + 1}. {room.name}</summary>
                <input
                  value={room.name}
                  onChange={(event) =>
                    setRooms((current) => current.map((item) => item.id === room.id ? { ...item, name: event.target.value } : item))
                  }
                />
                <textarea
                  value={room.description}
                  rows={3}
                  onChange={(event) =>
                    setRooms((current) => current.map((item) => item.id === room.id ? { ...item, description: event.target.value } : item))
                  }
                />
              </details>
            ))}
          </div>
        </aside>

        <main className="panel map-editor-board-panel p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="eyebrow">Canvas</div>
              <p className="text-sm text-stone-300">Paint rooms, corridors, doors, objectives, starts, and monsters.</p>
            </div>
            <button className="secondary-button compact" onClick={() => {
              setCells(makeEmptyCells());
              setMonsters([]);
            }}>
              <Eraser size={16} />
              Clear
            </button>
          </div>
          <div
            className="map-editor-grid"
            onMouseLeave={() => setPainting(false)}
            onMouseUp={() => setPainting(false)}
            style={{ "--editor-w": width, "--editor-h": height } as CSSProperties}
          >
            {cells.map((cell) => {
              const key = posKey(cell);
              const heroSlot = heroStartKeys.get(key);
              const monster = monsterByKey.get(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`map-editor-cell ${cell.type} ${cell.room ? `room-${cell.room.slice(-1)}` : "corridor"} ${brush !== "erase" ? "paintable" : ""}`}
                  onMouseDown={() => {
                    setPainting(true);
                    paintCell(cell.x, cell.y);
                  }}
                  onMouseEnter={() => {
                    if (painting && !["hero", "ogre-brute", "cult-priest", "demon-hound"].includes(brush)) paintCell(cell.x, cell.y);
                  }}
                  data-tooltip={`${cell.type === "void" ? "Empty background" : cell.label ?? cell.type}. ${cell.room ? `Room ${roomGlyph[cell.room] ?? cell.room}` : "Corridor or unassigned space"}.`}
                >
                  <span>{cell.room ? roomGlyph[cell.room] : ""}</span>
                  {heroSlot !== undefined && <i className="hero-start-marker">{heroSlot + 1}</i>}
                  {monster && <i className={`monster-marker ${monster.templateId}`}>{monsterTemplateById[monster.templateId].portraitGlyph}</i>}
                </button>
              );
            })}
          </div>
        </main>

        <aside className="panel map-editor-panel p-4">
          <div className="eyebrow mb-2">Brushes</div>
          <div className="brush-grid">
            {brushes.map(({ id, icon: Icon }) => (
              <button
                key={id}
                className={`brush-button ${brush === id ? "active" : ""}`}
                onClick={() => setBrush(id)}
                data-tooltip={`${brushLabel[id]} brush`}
              >
                <Icon size={15} />
                <span>{brushLabel[id]}</span>
              </button>
            ))}
          </div>

          {brush === "hero" && (
            <div className="mt-3 rounded-lg border border-amber-100/15 bg-black/30 p-3 text-sm text-stone-300">
              Next hero start: <strong className="text-amber-100">{activeHeroSlot + 1}</strong>
            </div>
          )}

          <div className="mt-4">
            <div className="eyebrow mb-2">Saved Maps</div>
            <div className="saved-map-list">
              {savedMaps.length === 0 && <p className="text-sm text-stone-400">No custom maps saved yet.</p>}
              {savedMaps.map((map) => (
                <div key={map.id} className="saved-map-row">
                  <button onClick={() => loadMap(map)}>
                    <strong>{map.name}</strong>
                    <span>{map.size.width}x{map.size.height}</span>
                  </button>
                  <button
                    aria-label={`Delete ${map.name}`}
                    onClick={() => setSavedMaps(deleteCustomMap(map.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <button className="secondary-button compact" onClick={() => setExportText(JSON.stringify(buildMap(), null, 2))}>
              <Download size={16} />
              Export JSON
            </button>
            <textarea className="json-box" value={exportText} onChange={(event) => setExportText(event.target.value)} rows={5} />
            <textarea className="json-box" placeholder="Paste map JSON to import" value={importText} onChange={(event) => setImportText(event.target.value)} rows={4} />
            <button className="secondary-button compact" onClick={importMap}>
              <Upload size={16} />
              Import JSON
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
