import type { MapDefinition, RoomDefinition, Tile, TileType } from "../types";

const roomTile = (
  x: number,
  y: number,
  type: TileType,
  label?: string,
  room?: string,
  open?: boolean,
): Tile => ({
  x,
  y,
  type,
  label,
  open,
  revealed: true,
  ...(room ? { room } : {}),
});

const door = (x: number, y: number, label = "Door"): Tile =>
  roomTile(x, y, "door", label, undefined, false);

const special = (
  x: number,
  y: number,
  type: TileType,
  label: string,
  room?: string,
): Tile => roomTile(x, y, type, label, room);

const roomSet = (rooms: RoomDefinition[]): Record<string, string> =>
  Object.fromEntries(rooms.map((room, index) => [String.fromCharCode(65 + index), room.id]));

const makeTilesFromRows = (
  rows: string[],
  roomByGlyph: Record<string, string>,
  overrides: Array<Partial<Tile> & Pick<Tile, "x" | "y">> = [],
): Tile[] => {
  const overrideByKey = new Map(overrides.map((tile) => [`${tile.x},${tile.y}`, tile]));

  return rows
    .map((row, y) =>
      [...row].map((glyph, x): Tile => {
        const base =
          glyph === "_"
            ? roomTile(x, y, "void")
            : glyph === "#"
            ? roomTile(x, y, "wall")
            : glyph === "d"
              ? door(x, y)
              : roomTile(x, y, "floor", undefined, roomByGlyph[glyph]);
        return { ...base, ...overrideByKey.get(`${x},${y}`) };
      }),
    )
    .flat();
};

const brokenWatchtowerRooms: RoomDefinition[] = [
  {
    id: "watch-entry",
    name: "Rain-Bitten Gatehouse",
    description:
      "Cold rain hisses through the broken roof. Old arrow slits breathe mist, and every flagstone is marked by boot-scrapes leading deeper into the tower.",
  },
  {
    id: "bell-armory",
    name: "Bell Armory",
    description:
      "A cracked bronze alarm bell hangs over racks of rusted spears. Something has stacked shields against the walls like trophies from failed patrols.",
  },
  {
    id: "collapsed-barracks",
    name: "Collapsed Barracks",
    description:
      "Bunks lie crushed beneath fallen masonry. The dust is fresh here, disturbed by broad dragging tracks and the sour stink of ogre breath.",
  },
  {
    id: "warden-stair",
    name: "Warden's Stair",
    description:
      "The lower stair coils down into red dark. The Ogre Warden waits among splintered beams, wearing the watchtower's iron bell chain as a belt.",
  },
];

const cursedReliquaryRooms: RoomDefinition[] = [
  {
    id: "reliquary-narthex",
    name: "Drowned Narthex",
    description:
      "Black water seeps between the tiles. Candle stubs float in little pools, their flames burning blue where no flame should survive.",
  },
  {
    id: "saint-vault",
    name: "Saint-Vault",
    description:
      "Reliquary niches stare from the walls like empty eye sockets. The relic rests ahead beneath glass filmed with frost and finger marks.",
  },
  {
    id: "flooded-crypt",
    name: "Flooded Crypt",
    description:
      "The crypt floor drops beneath ankle-deep water. Chains clink below the surface as if something underneath is breathing very slowly.",
  },
  {
    id: "ritual-vestry",
    name: "Ritual Vestry",
    description:
      "Chalk sigils crawl across the vestry floor. A cult priest has pinned prayer strips to the walls, each one inked with a name crossed out in red.",
  },
];

const ashenGateRooms: RoomDefinition[] = [
  {
    id: "ashen-approach",
    name: "Ashen Approach",
    description:
      "The air tastes of iron and snow. Ash drifts upward from cracks in the stone, and the distant portal beats like a second heart.",
  },
  {
    id: "ember-gallery",
    name: "Ember Gallery",
    description:
      "Charred statues line the gallery, their faces melted smooth. Three of them turn slightly as you enter, following the warmth of living blood.",
  },
  {
    id: "cinder-chapel",
    name: "Cinder Chapel",
    description:
      "A scorched altar splits the chapel in two. The old sacred tiles still glow where vows were carved deep enough to resist the fire.",
  },
  {
    id: "portal-nave",
    name: "Portal Nave",
    description:
      "The Ashen Gate tears open and closes by inches, showing a sky full of burning stars. Every anchor chain in the room strains toward it.",
  },
  {
    id: "chain-vault",
    name: "Chain Vault",
    description:
      "Iron chains vanish into the ceiling and floor. Each link is etched with a ward, and several have already cracked under the portal's pull.",
  },
  {
    id: "sealed-forge",
    name: "Sealed Forge",
    description:
      "A dead forge squats in the southern vault. Its coals are black, but the anvils are warm and ring softly when no one touches them.",
  },
];

export const campaignMaps: MapDefinition[] = [
  {
    id: "broken-watchtower",
    name: "The Broken Watchtower",
    subtitle: "Four shattered chambers around a rain-slick stair where the Ogre Warden keeps the lower gate.",
    size: { width: 21, height: 15 },
    rooms: brokenWatchtowerRooms,
    tiles: makeTilesFromRows(
      [
        "_____________________",
        "_#######_____#######_",
        "_#AAAAA#_____#BBBBB#_",
        "_#AAAAA#_____#BBBBB#_",
        "_#AAAAAd.....dBBBBB#_",
        "_#AAAAA#__.._#BBBBB#_",
        "_#######__.._#######_",
        "__________.._________",
        "_#######__.._#######_",
        "_#CCCCC#__.._#DDDDD#_",
        "_#CCCCCd.....dDDDDD#_",
        "_#CCCCC#__.._#DDDDD#_",
        "_#CCCCC#__.._#DDDDD#_",
        "_#######_____#######_",
        "_____________________",
      ],
      roomSet(brokenWatchtowerRooms),
      [
        door(7, 4, "Bent Iron Door"),
        door(13, 4, "Armory Door"),
        door(7, 10, "Split Barracks Door"),
        door(13, 10, "Warden Door"),
        special(16, 2, "altar", "Cracked Bell", "bell-armory"),
        special(4, 11, "difficult", "Fallen Bunks", "collapsed-barracks"),
        special(17, 12, "exit", "Stair Down", "warden-stair"),
        special(16, 10, "trap", "Falling Stone", "warden-stair"),
      ],
    ),
    heroStarts: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ],
    monsters: [
      {
        id: "ogre-warden",
        templateId: "ogre-brute",
        position: { x: 16, y: 11 },
        variantName: "Ogre Warden",
        hpBonus: 8,
        objectiveMonster: true,
      },
    ],
    objective: {
      hero: "Defeat the Ogre Warden.",
      dm: "Down heroes 3 total times.",
      type: "defeatBoss",
      required: 1,
    },
  },
  {
    id: "cursed-reliquary",
    name: "The Cursed Reliquary",
    subtitle: "A flooded chapel complex with reliquary vaults, crypt corridors, and a ritual vestry.",
    size: { width: 21, height: 15 },
    rooms: cursedReliquaryRooms,
    tiles: makeTilesFromRows(
      [
        "_____________________",
        "_#######_____#######_",
        "_#AAAAA#_____#BBBBB#_",
        "_#AAAAA#_____#BBBBB#_",
        "_#AAAAAd.....dBBBBB#_",
        "_#AAAAA#__.._#BBBBB#_",
        "_#######__.._#######_",
        "__________.._________",
        "_#######__.._#######_",
        "_#CCCCC#__.._#DDDDD#_",
        "_#CCCCCd.....dDDDDD#_",
        "_#CCCCC#__.._#DDDDD#_",
        "_#CCCCC#__.._#DDDDD#_",
        "_#######_____#######_",
        "_____________________",
      ],
      roomSet(cursedReliquaryRooms),
      [
        door(7, 4, "Reliquary Door"),
        door(13, 4, "Saint-Vault Door"),
        door(7, 10, "Crypt Door"),
        door(13, 10, "Vestry Door"),
        special(16, 2, "altar", "Cursed Relic", "saint-vault"),
        special(3, 12, "exit", "Crypt Egress", "flooded-crypt"),
        special(4, 10, "trap", "Snare Sigil", "flooded-crypt"),
        special(16, 10, "objective", "Ritual Circle", "ritual-vestry"),
        special(3, 11, "difficult", "Flooded Stone", "flooded-crypt"),
        special(5, 11, "difficult", "Flooded Stone", "flooded-crypt"),
      ],
    ),
    heroStarts: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ],
    monsters: [
      { id: "priest-reliquary", templateId: "cult-priest", position: { x: 16, y: 11 } },
      { id: "hound-reliquary", templateId: "demon-hound", position: { x: 16, y: 3 } },
    ],
    objective: {
      hero: "Recover the relic from the altar and carry it to the exit.",
      dm: "Complete the ritual track.",
      type: "relicToExit",
      required: 4,
    },
    escalation: {
      max: 4,
      label: "Ritual",
    },
  },
  {
    id: "ashen-gate",
    name: "The Ashen Gate",
    subtitle: "A six-room portal complex of ember galleries, cinder chapels, chain vaults, and sealed forge corridors.",
    size: { width: 25, height: 21 },
    rooms: ashenGateRooms,
    tiles: makeTilesFromRows(
      [
        "_________________________",
        "_#######_________#######_",
        "_#AAAAA#_________#BBBBB#_",
        "_#AAAAA#_________#BBBBB#_",
        "_#AAAAAd.........dBBBBB#_",
        "_#AAAAA#____.____#BBBBB#_",
        "_#######____.____#######_",
        "____________.____________",
        "_#######____.____#######_",
        "_#CCCCC#____.____#DDDDD#_",
        "_#CCCCCd.........dDDDDD#_",
        "_#CCCCC#____.____#DDDDD#_",
        "_#CCCCC#____.____#DDDDD#_",
        "_#######____.____#######_",
        "_#######____.____#######_",
        "_#FFFFFd.........dEEEEE#_",
        "_#FFFFF#_________#EEEEE#_",
        "_#FFFFF#_________#EEEEE#_",
        "_#FFFFF#_________#EEEEE#_",
        "_#######_________#######_",
        "_________________________",
      ],
      roomSet(ashenGateRooms),
      [
        door(7, 4, "Gallery Door"),
        door(17, 4, "Ember Gallery Door"),
        door(7, 10, "Chapel Door"),
        door(17, 10, "Portal Nave Door"),
        door(7, 15, "Forge Door"),
        door(17, 15, "Chain Vault Door"),
        special(20, 10, "portal", "Ashen Gate", "portal-nave"),
        special(21, 10, "portal", "Ashen Gate", "portal-nave"),
        special(21, 2, "anchor", "Gallery Anchor", "ember-gallery"),
        special(4, 11, "anchor", "Chapel Anchor", "cinder-chapel"),
        special(21, 17, "anchor", "Chain Anchor", "chain-vault"),
        special(4, 18, "anchor", "Forge Anchor", "sealed-forge"),
        special(22, 18, "exit", "Collapsed Arch", "chain-vault"),
        special(19, 11, "trap", "Ash Snare", "portal-nave"),
        special(4, 12, "difficult", "Cinders", "cinder-chapel"),
        special(19, 12, "difficult", "Cinders", "portal-nave"),
      ],
    ),
    heroStarts: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ],
    monsters: [
      { id: "gate-ogre", templateId: "ogre-brute", position: { x: 20, y: 12 } },
      { id: "gate-priest", templateId: "cult-priest", position: { x: 20, y: 17 } },
    ],
    objective: {
      hero: "Seal the portal by interacting with 3 anchors.",
      dm: "Keep the portal open for 8 rounds or defeat the relic carrier.",
      type: "sealAnchors",
      required: 3,
      roundLimit: 8,
    },
    escalation: {
      max: 8,
      label: "Portal",
    },
  },
];

export const mapById = Object.fromEntries(campaignMaps.map((map) => [map.id, map]));
