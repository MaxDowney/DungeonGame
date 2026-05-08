import { campaignMaps, mapById } from "../data/maps";
import { dmCards } from "../data/dmCards";
import { dmUpgrades } from "../data/upgrades";
import { heroCards } from "../data/heroCards";
import { heroTemplates } from "../data/heroes";
import { monsterTemplateById } from "../data/monsters";
import type {
  CampaignState,
  HeroProgress,
  MapState,
  PendingRewards,
  Position,
  RoomNarration,
  Unit,
} from "../types";
import { rollInitiative } from "./initiative";

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const createInitialCampaign = (): CampaignState => {
  const heroes = Object.fromEntries(
    heroTemplates.map((hero): [string, HeroProgress] => [
      hero.id,
      {
        heroId: hero.id,
        level: 1,
        scars: 0,
        boons: [],
        learnedCardIds: hero.startingCards,
        handCardIds: hero.startingCards,
      },
    ]),
  );

  const startingDmCards = dmCards.map((card) => card.id);

  return {
    id: crypto.randomUUID(),
    name: "The Ashen Gate",
    currentMapIndex: 0,
    glory: 0,
    dread: 0,
    heroes,
    dm: {
      level: 1,
      dread: 0,
      upgrades: [],
      unlockedCardIds: startingDmCards,
      deckCardIds: startingDmCards,
    },
    completedMaps: [],
    lastSavedAt: Date.now(),
  };
};

export const normalizeCampaignForCurrentData = (campaign: CampaignState): CampaignState => ({
  ...campaign,
  heroes: Object.fromEntries(
    heroTemplates.map((hero) => {
      const progress = campaign.heroes[hero.id];
      const learnedCardIds = Array.from(
        new Set([...(progress?.learnedCardIds ?? []), ...hero.startingCards]),
      );
      const missingStarterCards = hero.startingCards.filter(
        (cardId) => !(progress?.handCardIds ?? []).includes(cardId),
      );
      const handCardIds = Array.from(
        new Set([...(progress?.handCardIds ?? []), ...missingStarterCards]),
      ).slice(0, 6);

      return [
        hero.id,
        {
          heroId: hero.id,
          level: progress?.level ?? 1,
          scars: progress?.scars ?? 0,
          boons: progress?.boons ?? [],
          learnedCardIds,
          handCardIds,
        },
      ];
    }),
  ),
});

const createHeroUnit = (
  templateId: string,
  progress: HeroProgress,
  position: Position,
): Unit => {
  const template = heroTemplates.find((hero) => hero.id === templateId)!;
  const level = progress.level;
  const maxHp = template.stats.maxHp + Math.max(0, level - 1) * 2;
  return {
    id: `hero-${template.id}`,
    templateId: template.id,
    name: template.name,
    side: "heroes",
    classId: template.classId,
    portraitGlyph: template.portraitGlyph,
    color: template.color,
    role: template.role,
    level,
    maxHp,
    hp: maxHp,
    maxAp: template.stats.maxAp,
    ap: template.stats.maxAp,
    recovery: template.stats.recovery,
    speed: template.stats.speed,
    dt: template.stats.dt,
    defense: template.stats.defense,
    initiative: template.stats.initiative,
    accuracy: template.stats.accuracy,
    power: template.stats.power + Math.floor((level - 1) / 2),
    weapon: template.weapon,
    position,
    conditions: [],
    activated: false,
  };
};

const hasUpgrade = (campaign: CampaignState, upgradeId: string): boolean =>
  campaign.dm.upgrades.includes(upgradeId);

const createMonsterUnit = (
  campaign: CampaignState,
  mapMonster: (typeof campaignMaps)[number]["monsters"][number],
): Unit => {
  const template = monsterTemplateById[mapMonster.templateId];
  const isBrute = template.family === "brute";
  const isHound = template.family === "beast";
  const maxHp = template.stats.maxHp + (mapMonster.hpBonus ?? 0);
  const defense = template.stats.defense + (isBrute && hasUpgrade(campaign, "thick-hide") ? 1 : 0);
  const speed = template.stats.speed + (isHound && hasUpgrade(campaign, "vicious-hounds") ? 1 : 0);

  return {
    id: mapMonster.id,
    templateId: template.id,
    name: mapMonster.variantName ?? template.name,
    side: "dm",
    family: template.family,
    portraitGlyph: template.portraitGlyph,
    color: template.color,
    level: campaign.dm.level,
    maxHp,
    hp: maxHp,
    maxAp: template.stats.maxAp,
    ap: template.stats.maxAp,
    recovery: template.stats.recovery,
    speed,
    dt: template.stats.dt,
    defense,
    initiative: template.stats.initiative,
    accuracy: template.stats.accuracy,
    power: template.stats.power ?? 0,
    position: mapMonster.position,
    conditions: [],
    activated: false,
    resistance: 0,
    agro: {
      currentTargetId: null,
      pressure: 0,
    },
  };
};

export const roomNarrationFor = (
  map: (typeof campaignMaps)[number],
  roomId: string | undefined,
): RoomNarration | undefined => {
  if (!roomId) return undefined;
  const room = map.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return undefined;
  return {
    id: crypto.randomUUID(),
    roomId,
    name: room.name,
    text: room.description,
  };
};

export const setupMapState = (campaign: CampaignState, mapIndex = campaign.currentMapIndex): MapState => {
  const map = campaignMaps[mapIndex] ?? campaignMaps[0];
  const heroes = heroTemplates.map((hero, index) =>
    createHeroUnit(hero.id, campaign.heroes[hero.id], map.heroStarts[index]),
  );
  const monsters = map.monsters.map((monster) => createMonsterUnit(campaign, monster));
  const deck = shuffle(campaign.dm.deckCardIds.length ? campaign.dm.deckCardIds : dmCards.map((card) => card.id));
  const hand = deck.slice(0, 3);
  const dmDeck = deck.slice(3);
  const doom = hasUpgrade(campaign, "deeper-darkness") ? 1 : 0;
  const initiative = rollInitiative(heroes, monsters);
  const initialRoomId = map.tiles.find(
    (tile) => tile.x === map.heroStarts[0]?.x && tile.y === map.heroStarts[0]?.y,
  )?.room;
  const initialRoomNarration = roomNarrationFor(map, initialRoomId);
  const isInitiallyAwake = (unit: Unit): boolean => {
    if (unit.side === "heroes") return true;
    const roomId = map.tiles.find((tile) => tile.x === unit.position.x && tile.y === unit.position.y)?.room;
    return !roomId || roomId === initialRoomId;
  };
  const initialIndex = Math.max(
    0,
    initiative.order.findIndex((entry) => isInitiallyAwake([...heroes, ...monsters].find((unit) => unit.id === entry.unitId)!)),
  );
  const activeUnitId = initiative.order[initialIndex]?.unitId ?? null;

  return {
    mapId: map.id,
    round: 1,
    doom,
    escalation: 0,
    initiative: { ...initiative, currentIndex: initialIndex },
    activeUnitId,
    selectedUnitId: activeUnitId,
    selectedCardId: null,
    selectedMonsterActionId: null,
    selectedDmCardId: null,
    actionMode: "select",
    heroes,
    monsters,
    doorsOpened: map.tiles.filter((tile) => tile.type === "door" && tile.open).map((tile) => `${tile.x},${tile.y}`),
    objectives: {
      relicCarrierId: null,
      anchorsSealed: 0,
      sealedAnchorKeys: [],
      heroDowns: 0,
      scarredHeroIds: [],
      ritualProgress: 0,
      portalRounds: 0,
    },
    dmDeck,
    dmHand: hand,
    dmDiscard: [],
    dmCardPlayedThisRound: false,
    log: [
      ...(initialRoomNarration
        ? [
            {
              id: crypto.randomUUID(),
              round: 1,
              text: `Room discovered: ${initialRoomNarration.name}. ${initialRoomNarration.text}`,
              tone: "system" as const,
            },
          ]
        : []),
      {
        id: crypto.randomUUID(),
        round: 1,
        text: `${map.name} begins. Initiative order: ${initiative.order
          .map((entry) => `${entry.unitName} ${entry.total}`)
          .join(", ")}.`,
        tone: "system",
      },
    ],
    diceTray: [],
    floatingText: [],
    visitedRoomIds: initialRoomId ? [initialRoomId] : [],
    roomNarration: initialRoomNarration,
  };
};

export const currentMapDefinition = (mapState: MapState) => mapById[mapState.mapId];

export const mapWithDoors = (mapState: MapState) => {
  const map = currentMapDefinition(mapState);
  const visitedRoomIds = mapState.visitedRoomIds ?? [];
  return {
    ...map,
    tiles: map.tiles.map((tile) => {
      const revealed = !tile.room || visitedRoomIds.includes(tile.room);
      return tile.type === "door"
        ? { ...tile, open: mapState.doorsOpened.includes(`${tile.x},${tile.y}`), revealed }
        : { ...tile, revealed };
    }),
  };
};

export const createMapRewards = (
  campaign: CampaignState,
  mapState: MapState,
): PendingRewards => {
  const map = currentMapDefinition(mapState);
  const heroObjectiveComplete =
    map.objective.type === "defeatBoss"
      ? Boolean(mapState.objectives.bossDefeated)
      : map.objective.type === "relicToExit"
        ? Boolean(mapState.objectives.relicEscaped)
        : (mapState.objectives.anchorsSealed ?? 0) >= (map.objective.required ?? 3);

  const dmSchemeComplete =
    map.id === "broken-watchtower"
      ? (mapState.objectives.heroDowns ?? 0) >= 3
      : map.id === "cursed-reliquary"
        ? (mapState.objectives.ritualProgress ?? 0) >= (map.escalation?.max ?? 4)
        : mapState.round >= (map.objective.roundLimit ?? 8);

  const nextHeroChoices = Object.fromEntries(
    heroTemplates.map((hero) => {
      const progress = campaign.heroes[hero.id];
      const nextLevel = Math.min(5, progress.level + 1);
      const choices = heroCards
        .filter(
          (card) =>
            card.classId === hero.classId &&
            card.level <= nextLevel &&
            !progress.learnedCardIds.includes(card.id),
        )
        .slice(0, 3)
        .map((card) => card.id);
      return [hero.id, choices];
    }),
  );

  const dmUpgradeChoices = dmUpgrades
    .filter((upgrade) => !campaign.dm.upgrades.includes(upgrade.id))
    .filter((upgrade) => !upgrade.level || campaign.dm.level + 1 >= upgrade.level)
    .slice(0, 3)
    .map((upgrade) => upgrade.id);

  return {
    mapId: map.id,
    heroObjectiveComplete,
    dmSchemeComplete,
    glory: heroObjectiveComplete ? 3 : 1,
    dread: dmSchemeComplete ? 3 : 1,
    scars: Object.fromEntries(
      heroTemplates.map((hero) => [
        hero.id,
        mapState.objectives.scarredHeroIds?.includes(`hero-${hero.id}`) ? 1 : 0,
      ]),
    ),
    heroChoices: nextHeroChoices,
    dmUpgradeChoices,
  };
};

export const applyRewardsToCampaign = (
  campaign: CampaignState,
  rewards: PendingRewards,
  heroSelections: Record<string, string | undefined>,
  dmUpgradeId?: string,
): CampaignState => {
  const heroes = Object.fromEntries(
    Object.entries(campaign.heroes).map(([heroId, progress]) => {
      const selected = heroSelections[heroId];
      const learnedCardIds = selected
        ? Array.from(new Set([...progress.learnedCardIds, selected]))
        : progress.learnedCardIds;
      const handCardIds = learnedCardIds.slice(0, 6);
      return [
        heroId,
        {
          ...progress,
          level: Math.min(5, progress.level + 1),
          scars: progress.scars + (rewards.scars[heroId] ?? 0),
          boons: rewards.heroObjectiveComplete
            ? Array.from(new Set([...progress.boons, `${rewards.mapId}-boon`]))
            : progress.boons,
          learnedCardIds,
          handCardIds,
        },
      ];
    }),
  );

  const selectedUpgrade = dmUpgradeId ? dmUpgrades.find((upgrade) => upgrade.id === dmUpgradeId) : undefined;
  const completedMaps = Array.from(new Set([...campaign.completedMaps, rewards.mapId]));
  const currentMapIndex = Math.min(campaignMaps.length - 1, campaign.currentMapIndex + 1);

  return {
    ...campaign,
    currentMapIndex,
    glory: campaign.glory + rewards.glory,
    dread: campaign.dread + rewards.dread,
    heroes,
    dm: {
      ...campaign.dm,
      level: Math.min(5, campaign.dm.level + 1),
      dread: campaign.dm.dread + rewards.dread,
      upgrades: dmUpgradeId
        ? Array.from(new Set([...campaign.dm.upgrades, dmUpgradeId]))
        : campaign.dm.upgrades,
      specialization: selectedUpgrade?.specialization ?? campaign.dm.specialization,
    },
    completedMaps,
    pendingLevelUp: undefined,
    lastSavedAt: Date.now(),
  };
};
