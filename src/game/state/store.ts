import { create } from "zustand";
import { dmCardById } from "../data/dmCards";
import { heroCardById } from "../data/heroCards";
import { heroTemplates } from "../data/heroes";
import { campaignMaps } from "../data/maps";
import { monsterTemplateById } from "../data/monsters";
import { randomEncounterById, randomEncounterCards } from "../data/randomEncounters";
import { dmUpgradeById } from "../data/upgrades";
import { applyAgro } from "../engine/agro";
import { canSpendAp, recoverAp, spendAp } from "../engine/ap";
import {
  applyRewardsToCampaign,
  createInitialCampaign,
  createMapRewards,
  currentMapDefinition,
  mapWithDoors,
  normalizeCampaignForCurrentData,
  roomNarrationFor,
  setupMapState,
} from "../engine/campaign";
import { addCondition, removeOneCondition } from "../engine/conditions";
import { damageDiceForHero, effectiveDefense } from "../engine/combat";
import { rollDice } from "../engine/dice";
import { hasLineOfSight } from "../engine/los";
import {
  distance,
  effectiveMovementAllowance,
  getTile,
  isBlockedTile,
  multiMoveApCost,
  posKey,
  reachableTileCosts,
  reachableTiles,
  samePos,
  stepToward,
} from "../engine/movement";
import type {
  CampaignState,
  AttackRollResult,
  DiceExpression,
  DiceRoll,
  FloatingText,
  GameLogEntry,
  HeroCard,
  InitiativeEntry,
  MapState,
  MonsterAction,
  PendingAttack,
  PendingDiceRoll,
  Position,
  RandomEncounterCard,
  RollBanner,
  Screen,
  SettingsState,
  Tile,
  Unit,
} from "../types";
import {
  clearCampaign,
  loadSettings,
  loadSnapshot,
  saveSettings,
  saveSnapshot,
} from "./persistence";

interface GameStore {
  screen: Screen;
  campaign: CampaignState | null;
  mapState: MapState | null;
  settings: SettingsState;
  helpOpen: boolean;
  heroSelections: Record<string, string | undefined>;
  dmUpgradeSelection?: string;
  startNewCampaign: () => void;
  continueCampaign: () => void;
  resetCampaign: () => void;
  syncDataDefinitions: () => void;
  setScreen: (screen: Screen) => void;
  toggleHelp: () => void;
  dismissRoomNarration: () => void;
  dismissRandomEncounter: () => void;
  toggleDebug: () => void;
  startCurrentMap: () => void;
  selectUnit: (unitId: string | null) => void;
  setActionMode: (mode: MapState["actionMode"]) => void;
  selectHeroCard: (cardId: string | null) => void;
  selectMonsterAction: (actionId: string | null) => void;
  selectDmCard: (cardId: string | null) => void;
  boardClick: (position: Position) => void;
  playSelectedCardOnActive: () => void;
  playSelectedMonsterAction: () => void;
  playSelectedDmCard: () => void;
  rollPendingHit: () => void;
  rollPendingDamage: () => void;
  rollPendingUtilityDice: () => void;
  rollPendingInitiative: () => void;
  defendActive: () => void;
  restActive: () => void;
  waitActive: () => void;
  endActivation: () => void;
  resolveCurrentMap: () => void;
  selectRewardCard: (heroId: string, cardId: string) => void;
  selectRewardUpgrade: (upgradeId: string) => void;
  confirmRewards: () => void;
  toggleHandCard: (heroId: string, cardId: string) => void;
  saveGame: () => void;
  debugAddDoom: () => void;
  debugDamageSelected: (amount: number) => void;
  debugHealSelected: (amount: number) => void;
  debugCompleteObjective: () => void;
  debugResetAp: () => void;
}

const allUnits = (mapState: MapState): Unit[] => [...mapState.heroes, ...mapState.monsters];

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const getUnit = (mapState: MapState, unitId: string | null): Unit | undefined =>
  unitId ? allUnits(mapState).find((unit) => unit.id === unitId) : undefined;

const getActiveUnit = (mapState: MapState): Unit | undefined =>
  getUnit(mapState, mapState.activeUnitId);

const unitAt = (mapState: MapState, position: Position): Unit | undefined =>
  allUnits(mapState).find(
    (unit) =>
      !unit.defeated &&
      unit.position.x === position.x &&
      unit.position.y === position.y,
  );

const isPositionRevealed = (mapState: MapState, position: Position): boolean => {
  const tile = getTile(mapWithDoors(mapState), position);
  return Boolean(tile?.revealed);
};

const isUnitRevealed = (mapState: MapState, unit: Unit): boolean =>
  unit.side === "heroes" ||
  (mapState.revealedMonsterIds ?? []).includes(unit.id) ||
  isPositionRevealed(mapState, unit.position);

const canActivateInRevealedSpace = (mapState: MapState, unit: Unit): boolean =>
  !unit.defeated && !unit.downed && isUnitRevealed(mapState, unit);

const livingRevealedMonsters = (mapState: MapState): Unit[] =>
  mapState.monsters.filter((monster) => !monster.defeated && isUnitRevealed(mapState, monster));

const hasLivingRevealedMonsters = (mapState: MapState): boolean =>
  livingRevealedMonsters(mapState).length > 0;

const unitsEligibleForInitiative = (mapState: MapState): Unit[] =>
  allUnits(mapState).filter((unit) => !unit.defeated && !unit.downed && isUnitRevealed(mapState, unit));

const beginInitiativeRoll = (mapState: MapState, round = mapState.round): MapState => {
  const unitIds = unitsEligibleForInitiative(mapState).map((unit) => unit.id);
  return addLog(
    {
      ...mapState,
      initiative: { order: [], currentIndex: -1 },
      activeUnitId: null,
      selectedUnitId: null,
      selectedCardId: null,
      selectedMonsterActionId: null,
      selectedDmCardId: null,
      actionMode: "select",
      pendingAttack: undefined,
      pendingDiceRoll: undefined,
      pendingInitiativeRoll: {
        id: crypto.randomUUID(),
        round,
        unitIds,
        rolled: [],
      },
    },
    `Round ${round}: roll d10 + Initiative for each revealed figure.`,
    "system",
  );
};

const withActivationStartState = (mapState: MapState, activeUnitId = mapState.activeUnitId): MapState => {
  const active = getUnit(mapState, activeUnitId);
  return {
    ...mapState,
    actionTakenThisActivation: false,
    monsterDefeatedThisActivation: false,
    noRevealedMonstersAtActivationStart: Boolean(
      active?.side === "heroes" && !hasLivingRevealedMonsters(mapState),
    ),
  };
};

const nextRevealedInitiativeIndex = (
  mapState: MapState,
  startIndex = mapState.initiative.currentIndex + 1,
): number | undefined => {
  const units = allUnits(mapState);
  for (let index = startIndex; index < mapState.initiative.order.length; index += 1) {
    const unit = units.find((candidate) => candidate.id === mapState.initiative.order[index].unitId);
    if (unit && canActivateInRevealedSpace(mapState, unit) && !unit.activated) return index;
  }
  return undefined;
};

const revealVisibleMonsters = (mapState: MapState): MapState => {
  const map = mapWithDoors(mapState);
  const revealed = new Set(mapState.revealedMonsterIds ?? []);
  const livingHeroes = mapState.heroes.filter((hero) => !hero.defeated && !hero.downed);
  const newlyVisible = mapState.monsters.filter(
    (monster) =>
      !monster.defeated &&
      !revealed.has(monster.id) &&
      livingHeroes.some((hero) => hasLineOfSight(map, hero.position, monster.position)),
  );

  if (!newlyVisible.length) return mapState;

  newlyVisible.forEach((monster) => revealed.add(monster.id));
  let next: MapState = {
    ...mapState,
    revealedMonsterIds: Array.from(revealed),
  };

  if (!next.pendingInitiativeRoll && next.initiative.order.length) {
    const order = [...next.initiative.order];
    let insertAt = Math.max(0, next.initiative.currentIndex + 1);

    newlyVisible.forEach((monster) => {
      const existingIndex = order.findIndex((entry) => entry.unitId === monster.id);
      if (existingIndex >= 0) {
        if (existingIndex <= next.initiative.currentIndex && !monster.activated) {
          const [entry] = order.splice(existingIndex, 1);
          const adjustedInsertAt = existingIndex < insertAt ? insertAt - 1 : insertAt;
          order.splice(adjustedInsertAt, 0, entry);
          insertAt = adjustedInsertAt + 1;
        }
        return;
      }

      const entry: InitiativeEntry = {
        unitId: monster.id,
        unitName: monster.name,
        side: monster.side,
        roll: 0,
        bonus: monster.initiative,
        total: monster.initiative,
      };
      order.splice(insertAt, 0, entry);
      insertAt += 1;
    });

    next = { ...next, initiative: { ...next.initiative, order } };
  }

  newlyVisible.forEach((monster) => {
    next = addFloat(next, monster.position, "Spotted", "doom");
  });

  return addLog(
    next,
    `${newlyVisible.map((monster) => monster.name).join(", ")} ${newlyVisible.length === 1 ? "is" : "are"} revealed by line of sight and join the dungeon threat.`,
    "dm",
  );
};

const updateUnit = (mapState: MapState, unit: Unit): MapState => ({
  ...mapState,
  heroes: unit.side === "heroes"
    ? mapState.heroes.map((hero) => (hero.id === unit.id ? unit : hero))
    : mapState.heroes,
  monsters: unit.side === "dm"
    ? mapState.monsters.map((monster) => (monster.id === unit.id ? unit : monster))
    : mapState.monsters,
});

const updateUnits = (mapState: MapState, units: Unit[]): MapState =>
  units.reduce((next, unit) => updateUnit(next, unit), mapState);

const addLog = (
  mapState: MapState,
  text: string,
  tone: GameLogEntry["tone"] = "system",
): MapState => ({
  ...mapState,
  log: [
    {
      id: crypto.randomUUID(),
      round: mapState.round,
      text,
      tone,
    },
    ...mapState.log,
  ].slice(0, 80),
});

const addDice = (mapState: MapState, roll: DiceRoll): MapState => ({
  ...mapState,
  diceTray: [roll, ...mapState.diceTray].slice(0, 8),
});

const addFloat = (
  mapState: MapState,
  position: Position,
  text: string,
  tone: FloatingText["tone"],
): MapState => ({
  ...mapState,
  floatingText: [
    { id: crypto.randomUUID(), position, text, tone },
    ...mapState.floatingText,
  ].slice(0, 16),
});

const addRollBanner = (
  mapState: MapState,
  text: string,
  detail: string,
  tone: RollBanner["tone"],
): MapState => ({
  ...mapState,
  rollBanner: {
    id: crypto.randomUUID(),
    text,
    detail,
    tone,
  },
});

const enterRoomIfNeeded = (mapState: MapState, unit: Unit, position = unit.position): MapState => {
  if (unit.side !== "heroes") return mapState;
  const map = currentMapDefinition(mapState);
  const roomId = map.tiles.find((tile) => samePos(tile, position))?.room;
  if (!roomId || (mapState.visitedRoomIds ?? []).includes(roomId)) return mapState;
  const narration = roomNarrationFor(map, roomId);
  const next: MapState = {
    ...mapState,
    visitedRoomIds: [...(mapState.visitedRoomIds ?? []), roomId],
    roomNarration: narration ?? mapState.roomNarration,
  };

  return revealVisibleMonsters(
    narration
      ? addLog(next, `Room discovered: ${narration.name}. ${narration.text}`, "system")
      : next,
  );
};

const normalizeStartingRoomVisibility = (mapState: MapState): MapState => {
  const map = currentMapDefinition(mapState);
  const startPosition = map.heroStarts[0];
  const startRoomId = startPosition ? map.tiles.find((tile) => samePos(tile, startPosition))?.room : undefined;
  const visitedRoomIds = mapState.visitedRoomIds ?? [];
  const needsStartReveal = Boolean(startRoomId && !visitedRoomIds.includes(startRoomId));
  const heroes = mapState.heroes.map((hero, index) => {
    const tile = map.tiles.find((candidate) => samePos(candidate, hero.position));
    const validPosition = tile && tile.type !== "wall" && tile.type !== "void";
    return validPosition ? hero : { ...hero, position: map.heroStarts[index] ?? hero.position };
  });

  if (!needsStartReveal && heroes.every((hero, index) => samePos(hero.position, mapState.heroes[index]?.position ?? hero.position))) {
    return mapState;
  }

  const narration = needsStartReveal ? roomNarrationFor(map, startRoomId) : mapState.roomNarration;
  const next: MapState = {
    ...mapState,
    heroes,
    visitedRoomIds: needsStartReveal && startRoomId ? Array.from(new Set([startRoomId, ...visitedRoomIds])) : visitedRoomIds,
    roomNarration: narration,
  };

  return needsStartReveal && narration
    ? addLog(next, `Room discovered: ${narration.name}. ${narration.text}`, "system")
    : next;
};

const normalizeInitiativeState = (mapState: MapState): MapState => {
  const runtimeInitiative = mapState.initiative as Partial<MapState["initiative"]> | undefined;
  const normalizedRoomsBase = normalizeStartingRoomVisibility({
    ...mapState,
    visitedRoomIds: mapState.visitedRoomIds ?? [],
    actionTakenThisActivation: Boolean(mapState.actionTakenThisActivation),
  });
  const normalizedRooms: MapState = {
    ...normalizedRoomsBase,
    actionTakenThisActivation: Boolean(mapState.actionTakenThisActivation),
    noRevealedMonstersAtActivationStart: Boolean(mapState.noRevealedMonstersAtActivationStart),
    monsterDefeatedThisActivation: Boolean(mapState.monsterDefeatedThisActivation),
    monsterDefeatedThisRound: Boolean(mapState.monsterDefeatedThisRound),
    revealedMonsterIds: Array.isArray(mapState.revealedMonsterIds)
      ? mapState.revealedMonsterIds
      : normalizedRoomsBase.monsters
          .filter((monster) => isPositionRevealed(normalizedRoomsBase, monster.position))
          .map((monster) => monster.id),
    randomEncounterDeck: Array.isArray(mapState.randomEncounterDeck)
      ? mapState.randomEncounterDeck
      : shuffle(randomEncounterCards.map((card) => card.id)),
    randomEncounterDiscard: Array.isArray(mapState.randomEncounterDiscard) ? mapState.randomEncounterDiscard : [],
  };
  if (Array.isArray(runtimeInitiative?.order)) {
    const active = getActiveUnit(normalizedRooms);
    if (!active && !normalizedRooms.pendingInitiativeRoll && normalizedRooms.initiative.order.length === 0) {
      return beginInitiativeRoll(normalizedRooms, normalizedRooms.round);
    }
    if (!active || canActivateInRevealedSpace(normalizedRooms, active)) return normalizedRooms;
    const revealedIndex = nextRevealedInitiativeIndex({ ...normalizedRooms, initiative: { ...normalizedRooms.initiative, currentIndex: -1 } }, 0);
    const activeUnitId = revealedIndex === undefined ? null : normalizedRooms.initiative.order[revealedIndex]?.unitId ?? null;
    return withActivationStartState({
      ...normalizedRooms,
      initiative: {
        ...normalizedRooms.initiative,
        currentIndex: revealedIndex ?? normalizedRooms.initiative.currentIndex,
      },
      activeUnitId,
      selectedUnitId: activeUnitId,
    }, activeUnitId);
  }

  const heroes = normalizedRooms.heroes.map((unit) => ({ ...unit, activated: false }));
  const monsters = normalizedRooms.monsters.map((unit) => ({ ...unit, activated: false }));
  return addLog(
    beginInitiativeRoll({
      ...normalizedRooms,
      heroes,
      monsters,
      initiative: { order: [], currentIndex: -1 },
      activeUnitId: null,
      selectedUnitId: null,
      selectedCardId: null,
      selectedMonsterActionId: null,
      selectedDmCardId: null,
      actionMode: "select",
      actionTakenThisActivation: false,
    }),
    "Initiative now uses manual per-figure d10 + Initiative rolls.",
    "system",
  );
};

const isValidTarget = (
  mapState: MapState,
  actor: Unit,
  target: Unit,
  range: number,
  requiresLos?: boolean,
  allowDowned = false,
): boolean => {
  const map = mapWithDoors(mapState);
  if (actor.side === "heroes" && target.side === "dm" && !isUnitRevealed(mapState, target)) return false;
  if (distance(actor.position, target.position) > range) return false;
  if (requiresLos && !hasLineOfSight(map, actor.position, target.position)) return false;
  return !target.defeated && (!target.downed || allowDowned);
};

const cardIncludesWeapon = (card: HeroCard): boolean =>
  card.type === "Attack" && !["ranger-quick-shot"].includes(card.id);

const cardCanRevive = (card: HeroCard): boolean =>
  card.effects.some((effect) => effect.kind === "heal" && effect.revive);

const basicAttackProfile = (attacker: Unit) => ({
  accuracyModifier: 0,
  criticalBonus: 0,
  fumbleBonus: 0,
  hitType: attacker.weapon?.range && attacker.weapon.range > 1 ? "ranged" as const : "melee_or_weapon" as const,
  requiresAttackRoll: true as const,
  targetDT: "dt" as const,
});

const clampRollBonus = (value: number): number => Math.max(0, Math.min(5, value));

type PendingAttackStart = Omit<
  PendingAttack,
  "id" | "stage" | "targetId" | "remainingTargetIds" | "targetIndex" | "totalTargets" | "hitRoll"
> & {
  targetId?: string;
  targetIds?: string[];
};

const uniqueIds = (ids: string[]): string[] => Array.from(new Set(ids));

const pendingAttackProgress = (pending: Pick<PendingAttack, "targetIndex" | "totalTargets">): string =>
  pending.totalTargets && pending.totalTargets > 1
    ? ` (${(pending.targetIndex ?? 0) + 1}/${pending.totalTargets})`
    : "";

const pendingAttackLogLine = (
  mapState: MapState,
  pending: Pick<PendingAttack, "attackerId" | "sourceName" | "targetId" | "targetIndex" | "totalTargets">,
): string => {
  const attackerName = getUnit(mapState, pending.attackerId)?.name ?? "Attacker";
  const targetName = getUnit(mapState, pending.targetId)?.name ?? "target";
  return `${attackerName} lines up ${pending.sourceName}${pendingAttackProgress(pending)} on ${targetName}. Roll d20 to hit.`;
};

const beginPendingAttack = (
  mapState: MapState,
  attack: PendingAttackStart,
): MapState => {
  const targetIds = uniqueIds((attack.targetIds?.length ? attack.targetIds : attack.targetId ? [attack.targetId] : []).filter(Boolean));
  const [targetId, ...remainingTargetIds] = targetIds;
  if (!targetId) return addLog(mapState, "No valid targets are available for that attack.", "system");

  const { targetId: _singleTargetId, targetIds: _targetIds, ...pendingBase } = attack;
  const pendingAttack: PendingAttack = {
    ...pendingBase,
    targetId,
    remainingTargetIds,
    targetIndex: 0,
    totalTargets: targetIds.length,
    id: crypto.randomUUID(),
    stage: "hit",
  };

  return addLog(
    {
      ...mapState,
      pendingAttack,
      pendingDiceRoll: undefined,
      selectedCardId: null,
      selectedMonsterActionId: null,
      selectedDmCardId: null,
      actionMode: "select",
    },
    pendingAttackLogLine(mapState, pendingAttack),
    attack.sourceKind === "monsterAction" ? "dm" : "hero",
  );
};

const advancePendingAttack = (mapState: MapState, pending: PendingAttack): MapState => {
  const attacker = getUnit(mapState, pending.attackerId);
  if (!attacker || attacker.defeated || attacker.downed) return { ...mapState, pendingAttack: undefined };

  const remaining = pending.remainingTargetIds ?? [];
  let skipped = 0;
  for (let index = 0; index < remaining.length; index += 1) {
    const targetId = remaining[index];
    const target = getUnit(mapState, targetId);
    if (!target || target.defeated || target.downed) {
      skipped += 1;
      continue;
    }

    const nextPending: PendingAttack = {
      ...pending,
      id: crypto.randomUUID(),
      stage: "hit",
      targetId,
      remainingTargetIds: remaining.slice(index + 1),
      targetIndex: (pending.targetIndex ?? 0) + skipped + 1,
      totalTargets: pending.totalTargets,
      hitRoll: undefined,
    };

    return addLog(
      {
        ...mapState,
        pendingAttack: nextPending,
      },
      pendingAttackLogLine(mapState, nextPending),
      pending.sourceKind === "monsterAction" ? "dm" : "hero",
    );
  }

  return { ...mapState, pendingAttack: undefined };
};

const beginPendingDiceRoll = (
  mapState: MapState,
  roll: Omit<PendingDiceRoll, "id">,
): MapState =>
  addLog(
    {
      ...mapState,
      pendingDiceRoll: {
        ...roll,
        id: crypto.randomUUID(),
      },
      pendingAttack: undefined,
      selectedCardId: null,
      selectedMonsterActionId: null,
      selectedDmCardId: null,
      actionMode: "select",
    },
    `${roll.label} is ready. Roll ${roll.dice.join(" + ")}${roll.flat ? ` + ${roll.flat}` : ""}.`,
    roll.kind === "heal" ? "heal" : "system",
  );

const applyCardAgro = (mapState: MapState, actor: Unit, card: HeroCard, target?: Unit): MapState => {
  if (!card.agro || card.agro.type === "none") return mapState;

  const visibleMonsters = mapState.monsters.filter(
    (monster) =>
      !monster.defeated &&
      isUnitRevealed(mapState, monster) &&
      hasLineOfSight(mapWithDoors(mapState), actor.position, monster.position),
  );
  const adjacentMonsters = mapState.monsters.filter(
    (monster) => !monster.defeated && isUnitRevealed(mapState, monster) && distance(actor.position, monster.position) <= 1,
  );
  const monsters =
    card.agro.scope === "visibleMonsters"
      ? visibleMonsters
      : card.agro.scope === "adjacentMonsters"
        ? adjacentMonsters
        : target?.side === "dm"
          ? [target]
          : [];

  let next = mapState;
  monsters.forEach((monster) => {
    const result = applyAgro(
      monster,
      actor.id,
      card.agro!.type,
      card.agro!.amount,
      card.agro!.pressure ?? 1,
    );
    if (result.changed) {
      next = updateUnit(next, result.monster);
      next = addFloat(next, result.monster.position, "Threat", "agro");
    }
  });
  return next;
};

const applyAttackAgro = (
  mapState: MapState,
  actor: Unit,
  target: Unit,
  agro: PendingAttack["agro"],
  mode: "hit" | "miss" | "critical",
): MapState => {
  if (!agro || agro.type === "none" || actor.side !== "heroes" || target.side !== "dm") return mapState;

  let next = mapState;
  const map = mapWithDoors(mapState);
  const amount =
    mode === "miss" && agro.type === "Pull"
      ? Math.floor(agro.amount / 2)
      : agro.amount;
  if (amount <= 0 && mode !== "critical") return mapState;

  const candidates =
    agro.scope === "visibleMonsters"
      ? mapState.monsters.filter(
          (monster) =>
            !monster.defeated && isUnitRevealed(mapState, monster) && hasLineOfSight(map, actor.position, monster.position),
        )
      : [target];

  candidates.forEach((monster) => {
    if (mode === "miss" && agro.type !== "Pull") return;
    const result = applyAgro(
      monster,
      actor.id,
      mode === "critical"
        ? monster.agro?.currentTargetId === actor.id
          ? "Hold"
          : "Pull"
        : agro.type,
      mode === "critical" ? 1 : amount,
      agro.pressure ?? 1,
    );
    if (result.changed) {
      next = updateUnit(next, result.monster);
      next = addFloat(next, monster.position, mode === "critical" ? "+Threat" : agro.type, "agro");
    }
  });

  return next;
};

const applySupportAgro = (
  mapState: MapState,
  actor: Unit | undefined,
  agro: PendingDiceRoll["agro"],
): MapState => {
  if (!actor || actor.side !== "heroes" || !agro || agro.type === "none") return mapState;
  const map = mapWithDoors(mapState);
  const monsters =
    agro.scope === "visibleMonsters"
      ? mapState.monsters.filter(
          (monster) =>
            !monster.defeated && isUnitRevealed(mapState, monster) && hasLineOfSight(map, actor.position, monster.position),
        )
      : mapState.monsters.filter((monster) => !monster.defeated && isUnitRevealed(mapState, monster) && distance(actor.position, monster.position) <= 1);
  let next = mapState;
  monsters.forEach((monster) => {
    const result = applyAgro(monster, actor.id, agro.type, agro.amount, agro.pressure ?? 1);
    if (result.changed) {
      next = updateUnit(next, result.monster);
      next = addFloat(next, monster.position, agro.type, "agro");
    }
  });
  return next;
};

const monsterTargetCandidates = (
  mapState: MapState,
  actor: Unit,
  range: number,
  requiresLos?: boolean,
): Unit[] =>
  mapState.heroes
    .filter((hero) => isValidTarget(mapState, actor, hero, range, requiresLos))
    .sort((a, b) => distance(actor.position, a.position) - distance(actor.position, b.position));

const legalMonsterTargetIds = (
  mapState: MapState,
  actor: Unit,
  range: number,
  requiresLos?: boolean,
): string[] => {
  const candidates = monsterTargetCandidates(mapState, actor, range, requiresLos);
  const current = actor.agro?.currentTargetId
    ? candidates.find((hero) => hero.id === actor.agro?.currentTargetId)
    : undefined;
  if (current) return [current.id];
  return candidates[0] ? [candidates[0].id] : [];
};

const enforceMonsterTargeting = (
  mapState: MapState,
  actor: Unit,
  action: MonsterAction,
  target?: Unit,
): { mapState: MapState; actor: Unit; target?: Unit; error?: string } => {
  const legalIds = legalMonsterTargetIds(mapState, actor, action.range, action.requiresLos);
  const legalTarget = legalIds[0] ? mapState.heroes.find((hero) => hero.id === legalIds[0]) : undefined;

  if (!legalTarget) {
    return { mapState, actor, error: "No legal hero target is visible or reachable for that monster action." };
  }

  if (!target || target.id !== legalTarget.id) {
    return {
      mapState,
      actor,
      error: `${actor.name} must target ${legalTarget.name} because of Current Target and Pressure.`,
    };
  }

  const currentTargetValid = actor.agro?.currentTargetId === legalTarget.id;
  if (actor.agro?.currentTargetId && !currentTargetValid) {
    const updatedActor = { ...actor, agro: { currentTargetId: legalTarget.id, pressure: 0 } };
    return {
      mapState: addLog(
        updateUnit(mapState, updatedActor),
        `${actor.name}'s Current Target is unreachable or unseen, so it snaps to ${legalTarget.name} and Pressure drops to 0.`,
        "dm",
      ),
      actor: updatedActor,
      target: legalTarget,
    };
  }

  return { mapState, actor, target: legalTarget };
};

const applyCriticalFailure = (
  mapState: MapState,
  attacker: Unit,
  target: Unit,
  pending: PendingAttack,
  attackRoll: string,
): MapState => {
  let next = mapState;
  const exposed = addCondition({ ...attacker, ap: 0 }, "Exposed", 1);
  next = updateUnit(next, exposed);

  if (attacker.side === "heroes" && target.side === "dm") {
    const primary = applyAgro(target, attacker.id, "Pull", 4, 1);
    if (primary.changed) next = updateUnit(next, primary.monster);
    mapState.monsters
      .filter(
        (monster) =>
          monster.id !== target.id &&
          !monster.defeated &&
          isUnitRevealed(mapState, monster) &&
          hasLineOfSight(mapWithDoors(mapState), attacker.position, monster.position),
      )
      .forEach((monster) => {
        const result = applyAgro(monster, attacker.id, "Pull", 2, 1);
        if (result.changed) next = updateUnit(next, result.monster);
      });
  }

  if (attacker.side === "dm") {
    next = { ...next, doom: Math.max(0, next.doom - 1) };
  }

  next = addFloat(next, attacker.position, "CRITICAL FAILURE", "damage");
  next = addRollBanner(next, "CRITICAL FAILURE", `${attacker.name} loses all remaining AP and gains Exposed.`, "fumble");
  next = addLog(
    next,
    `${attacker.name} uses ${pending.sourceName} on ${target.name}. ${attackRoll}. Critical Failure. The attack misses, ${attacker.name} loses all remaining AP, gains Exposed${
      attacker.side === "dm" ? ", and the DM loses 1 Doom" : ", and threat surges"
    }.`,
    "damage",
  );
  return next;
};

const maybeApplyMapObjectivesAfterDamage = (
  mapState: MapState,
  target: Unit,
  updatedTarget: Unit,
): MapState => {
  let next = mapState;
  if (target.side === "dm" && updatedTarget.defeated && !target.defeated) {
    next = {
      ...next,
      monsterDefeatedThisActivation: true,
      monsterDefeatedThisRound: true,
    };
    const map = currentMapDefinition(mapState);
    const mapMonster = map.monsters.find((monster) => monster.id === target.id);
    if (mapMonster?.objectiveMonster || map.objective.type === "defeatBoss") {
      const remainingObjectiveMonsters = map.monsters
        .filter((monster) => monster.objectiveMonster || map.objective.type === "defeatBoss")
        .filter((monster) => monster.id !== target.id)
        .some((monster) => !mapState.monsters.find((unit) => unit.id === monster.id)?.defeated);
      next = {
        ...next,
        objectives: {
          ...next.objectives,
          bossDefeated: !remainingObjectiveMonsters,
        },
      };
    }
  }

  if (target.side === "heroes" && updatedTarget.downed && !target.downed) {
    next = {
      ...next,
      objectives: {
        ...next.objectives,
        heroDowns: (next.objectives.heroDowns ?? 0) + 1,
        scarredHeroIds: Array.from(
          new Set([...(next.objectives.scarredHeroIds ?? []), target.id]),
        ),
      },
    };
  }

  return next;
};

const spendAndUpdate = (mapState: MapState, unit: Unit, cost: number): [MapState, Unit] => {
  const spent = spendAp(unit, cost);
  return [
    updateUnit(
      {
        ...mapState,
        actionTakenThisActivation: mapState.activeUnitId === unit.id ? true : mapState.actionTakenThisActivation,
      },
      spent,
    ),
    spent,
  ];
};

const encounterKindLabel = (card: RandomEncounterCard): string =>
  card.kind === "monster"
    ? "Monster"
    : card.kind === "treasure"
      ? "Treasure"
      : card.disposition === "bad"
        ? "NPC - Trouble"
        : "NPC - Ally";

const createEncounterMonsterUnit = (
  campaign: CampaignState | null,
  templateId: string,
  position: Position,
  sourceName: string,
  index: number,
): Unit | undefined => {
  const template = monsterTemplateById[templateId];
  if (!template) return undefined;
  const isBrute = template.family === "brute";
  const isHound = template.family === "beast";
  const hasUpgrade = (upgradeId: string) => Boolean(campaign?.dm.upgrades.includes(upgradeId));
  const defense = template.stats.defense + (isBrute && hasUpgrade("thick-hide") ? 1 : 0);
  const speed = template.stats.speed + (isHound && hasUpgrade("vicious-hounds") ? 1 : 0);
  const maxHp = template.stats.maxHp;

  return {
    id: `encounter-${template.id}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    templateId: template.id,
    name: `${sourceName}: ${template.name}`,
    side: "dm",
    family: template.family,
    portraitGlyph: template.portraitGlyph,
    color: template.color,
    level: campaign?.dm.level ?? 1,
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
    position,
    conditions: [],
    activated: false,
    resistance: 0,
    agro: {
      currentTargetId: null,
      pressure: 0,
    },
  };
};

const encounterSpawnPositions = (mapState: MapState, anchor: Unit): Position[] => {
  const map = mapWithDoors(mapState);
  const occupied = new Set(allUnits(mapState).filter((unit) => !unit.defeated && !unit.downed).map((unit) => posKey(unit.position)));
  const candidates = map.tiles
    .filter((tile) => tile.revealed && !isBlockedTile(tile) && !occupied.has(posKey(tile)))
    .map((tile) => ({ x: tile.x, y: tile.y }))
    .filter((position) => distance(position, anchor.position) > 0)
    .sort((a, b) => distance(b, anchor.position) - distance(a, anchor.position));

  return shuffle(candidates.length ? candidates : map.tiles
    .filter((tile) => tile.revealed && !isBlockedTile(tile) && !occupied.has(posKey(tile)))
    .map((tile) => ({ x: tile.x, y: tile.y })));
};

const spawnEncounterMonsters = (
  mapState: MapState,
  campaign: CampaignState | null,
  anchor: Unit,
  card: RandomEncounterCard,
): MapState => {
  if (!card.effect.monsterTemplateId) return mapState;
  const count = Math.max(1, card.effect.count ?? 1);
  let next = mapState;
  let spawned = 0;

  for (let index = 0; index < count; index += 1) {
    const position = encounterSpawnPositions(next, anchor)[0];
    const monster = position
      ? createEncounterMonsterUnit(campaign, card.effect.monsterTemplateId, position, card.name, index + 1)
      : undefined;
    if (!monster) continue;
    spawned += 1;
    next = {
      ...next,
      monsters: [...next.monsters, monster],
      revealedMonsterIds: Array.from(new Set([...(next.revealedMonsterIds ?? []), monster.id])),
    };
    next = addFloat(next, monster.position, "Encounter", "doom");
  }

  return spawned
    ? addLog(next, `${card.name} adds ${spawned} monster${spawned === 1 ? "" : "s"}. They will roll into the next initiative order.`, "dm")
    : addLog(next, `${card.name} found no revealed empty space for a monster.`, "system");
};

const applyEncounterHeroEffects = (
  mapState: MapState,
  card: RandomEncounterCard,
  active: Unit,
): MapState => {
  let next = mapState;
  const effect = card.effect;

  if (effect.healAll) {
    next = updateUnits(
      next,
      next.heroes
        .filter((hero) => !hero.defeated && !hero.downed)
        .map((hero) => ({ ...hero, hp: Math.min(hero.maxHp, hero.hp + effect.healAll!) })),
    );
    next.heroes
      .filter((hero) => !hero.defeated && !hero.downed)
      .forEach((hero) => {
        next = addFloat(next, hero.position, `+${effect.healAll} HP`, "heal");
      });
  }

  if (effect.apAll) {
    next = updateUnits(
      next,
      next.heroes
        .filter((hero) => !hero.defeated && !hero.downed)
        .map((hero) => ({ ...hero, ap: Math.min(hero.maxAp, hero.ap + effect.apAll!) })),
    );
    next.heroes
      .filter((hero) => !hero.defeated && !hero.downed)
      .forEach((hero) => {
        next = addFloat(next, hero.position, `+${effect.apAll} AP`, "ap");
      });
  }

  if (effect.defenseAll) {
    next = updateUnits(
      next,
      next.heroes
        .filter((hero) => !hero.defeated && !hero.downed)
        .map((hero) => ({ ...hero, defending: (hero.defending ?? 0) + effect.defenseAll! })),
    );
    next.heroes
      .filter((hero) => !hero.defeated && !hero.downed)
      .forEach((hero) => {
        next = addFloat(next, hero.position, `Guard ${effect.defenseAll}`, "ap");
      });
  }

  if (effect.condition) {
    const target = getUnit(next, active.id);
    if (target && !target.defeated && !target.downed) {
      const conditioned = addCondition(target, effect.condition, effect.conditionDuration ?? 1, effect.conditionValue);
      next = updateUnit(next, conditioned);
      next = addFloat(next, conditioned.position, effect.condition, "damage");
    }
  }

  if (effect.doomDelta) {
    next = { ...next, doom: Math.max(0, next.doom + effect.doomDelta) };
    next = addFloat(next, active.position, effect.doomDelta > 0 ? `+${effect.doomDelta} Doom` : `${effect.doomDelta} Doom`, "doom");
  }

  return next;
};

const drawEncounterCard = (
  mapState: MapState,
): { card: RandomEncounterCard; deck: string[]; discard: string[] } => {
  const fullDeck = randomEncounterCards.map((card) => card.id);
  const deckSource = mapState.randomEncounterDeck.length
    ? mapState.randomEncounterDeck
    : shuffle(mapState.randomEncounterDiscard.length ? mapState.randomEncounterDiscard : fullDeck);
  const discardSource = mapState.randomEncounterDeck.length ? mapState.randomEncounterDiscard : [];
  const [cardId, ...deck] = deckSource;
  const card = randomEncounterById[cardId] ?? randomEncounterCards[0];
  return {
    card,
    deck,
    discard: [...discardSource, card.id],
  };
};

const drawAndApplyRandomEncounter = (
  mapState: MapState,
  campaign: CampaignState | null,
  anchor: Unit,
): MapState => {
  const { card, deck, discard } = drawEncounterCard(mapState);
  let next: MapState = {
    ...mapState,
    randomEncounterDeck: deck,
    randomEncounterDiscard: discard,
    activeRandomEncounter: {
      id: crypto.randomUUID(),
      cardId: card.id,
      effectSummary: card.effectText,
    },
  };

  next = addRollBanner(
    next,
    "RANDOM ENCOUNTER",
    card.name,
    card.kind === "treasure" || card.disposition === "good" ? "heal" : "damage",
  );
  next = addLog(
    next,
    `Random encounter (${encounterKindLabel(card)}): ${card.name}. ${card.effectText}`,
    card.kind === "monster" || card.disposition === "bad" ? "dm" : "hero",
  );
  next = applyEncounterHeroEffects(next, card, anchor);
  next = spawnEncounterMonsters(next, campaign, anchor, card);
  return next;
};

const maybeDrawRandomEncounterAtRoundEnd = (
  mapState: MapState,
  campaign: CampaignState | null,
): MapState => {
  if (mapState.activeRandomEncounter) return mapState;
  if (mapState.monsterDefeatedThisRound) return mapState;
  if (hasLivingRevealedMonsters(mapState)) return mapState;
  const anchor = mapState.heroes.find((hero) => !hero.defeated && !hero.downed) ?? mapState.heroes[0];
  return anchor ? drawAndApplyRandomEncounter(mapState, campaign, anchor) : mapState;
};

const advanceActivation = (mapState: MapState, campaign: CampaignState | null): MapState => {
  if (!mapState.activeUnitId) return mapState;
  const active = getActiveUnit(mapState);
  if (!active) return mapState;
  let next = updateUnit(mapState, { ...active, activated: true });
  const nextIndex = nextRevealedInitiativeIndex(next);

  if (nextIndex === undefined) {
    const beastmaster = Boolean(campaign?.dm.specialization === "Beastmaster");
    const recoveredHeroes = next.heroes.map((unit) => recoverAp({ ...unit, activated: false }));
    const recoveredMonsters = next.monsters.map((unit) =>
      recoverAp({ ...unit, activated: false }, beastmaster && unit.family === "beast" ? 1 : 0),
    );
    const drawn = next.dmDeck[0];
    next = {
      ...next,
      round: next.round + 1,
      doom: next.doom + 1,
      escalation: Math.min(currentMapDefinition(next).escalation?.max ?? 99, next.escalation + 1),
      heroes: recoveredHeroes,
      monsters: recoveredMonsters,
      initiative: { order: [], currentIndex: -1 },
      activeUnitId: null,
      selectedUnitId: null,
      selectedCardId: null,
      selectedMonsterActionId: null,
      selectedDmCardId: null,
      actionMode: "select",
      actionTakenThisActivation: false,
      monsterDefeatedThisActivation: false,
      pendingAttack: undefined,
      pendingDiceRoll: undefined,
      dmHand: drawn ? [...next.dmHand, drawn].slice(0, 5) : next.dmHand,
      dmDeck: drawn ? next.dmDeck.slice(1) : next.dmDeck,
      dmCardPlayedThisRound: false,
      objectives: {
        ...next.objectives,
        portalRounds: (next.objectives.portalRounds ?? 0) + 1,
      },
    };
    next = maybeDrawRandomEncounterAtRoundEnd(next, campaign);
    next = {
      ...next,
      monsterDefeatedThisRound: false,
    };
    return beginInitiativeRoll(
      addLog(next, `Round ${next.round} begins. Doom rises by 1. Draw initiative dice before anyone acts.`, "system"),
      next.round,
    );
  }

  const activeUnitId = next.initiative.order[nextIndex]?.unitId ?? null;
  return withActivationStartState({
    ...next,
    initiative: { ...next.initiative, currentIndex: nextIndex },
    activeUnitId,
    selectedUnitId: activeUnitId,
    selectedCardId: null,
    selectedMonsterActionId: null,
    selectedDmCardId: null,
    actionMode: "select",
    actionTakenThisActivation: false,
    pendingAttack: undefined,
    pendingDiceRoll: undefined,
  }, activeUnitId);
};

const waitActiveUnit = (mapState: MapState): MapState => {
  if (
    !mapState.activeUnitId ||
    mapState.pendingAttack ||
    mapState.pendingDiceRoll ||
    mapState.pendingInitiativeRoll ||
    mapState.resolved
  ) {
    return mapState;
  }

  const active = getActiveUnit(mapState);
  if (!active || active.activated || active.defeated || active.downed) return mapState;

  const currentIndex = mapState.initiative.order.findIndex((entry) => entry.unitId === active.id);
  if (currentIndex < 0) return mapState;

  const nextReadyIndex = nextRevealedInitiativeIndex(mapState, currentIndex + 1);
  if (nextReadyIndex === undefined) {
    return addLog(mapState, `${active.name} is already the last ready figure in the initiative order.`, "system");
  }

  const order = [...mapState.initiative.order];
  const [entry] = order.splice(currentIndex, 1);
  order.push(entry);

  const shifted: MapState = {
    ...mapState,
    initiative: { ...mapState.initiative, order, currentIndex: currentIndex - 1 },
    activeUnitId: null,
    selectedUnitId: null,
    selectedCardId: null,
    selectedMonsterActionId: null,
    selectedDmCardId: null,
    actionMode: "select",
  };
  const nextIndex = nextRevealedInitiativeIndex(shifted, currentIndex);
  const activeUnitId = nextIndex === undefined ? null : order[nextIndex]?.unitId ?? null;

  return addFloat(
    withActivationStartState(
      addLog(
        {
          ...shifted,
          initiative: { ...shifted.initiative, currentIndex: nextIndex ?? shifted.initiative.currentIndex },
          activeUnitId,
          selectedUnitId: activeUnitId,
        },
        `${active.name} waits, keeping all AP and sliding to the end of the initiative order.`,
        active.side === "heroes" ? "hero" : "dm",
      ),
      activeUnitId,
    ),
    active.position,
    "Wait",
    "ap",
  );
};

const autoEndActivationIfSpent = (
  mapState: MapState,
  campaign: CampaignState | null,
  unitId?: string,
): MapState => {
  if (!unitId || mapState.pendingAttack || mapState.pendingDiceRoll || mapState.resolved) return mapState;
  if (mapState.activeUnitId !== unitId) return mapState;
  const active = getUnit(mapState, unitId);
  if (!active || active.ap > 0 || active.activated) return mapState;
  return advanceActivation(
    addLog(
      mapState,
      `${active.name} has no AP remaining. Activation ends automatically.`,
      active.side === "heroes" ? "hero" : "dm",
    ),
    campaign,
  );
};

const moveUnitTo = (mapState: MapState, unit: Unit, position: Position, cost?: number): MapState => {
  const map = mapWithDoors(mapState);
  const apCost = cost ?? multiMoveApCost(map, unit, allUnits(mapState), position);
  if (!apCost || !canSpendAp(unit, apCost)) return addLog(mapState, "That move is not legal.", "system");

  const tile = getTile(map, position);
  let moved: Unit = { ...unit, position };
  if (tile?.type === "trap" && unit.side === "heroes") {
    moved = { ...moved, ap: Math.max(0, moved.ap - 1) };
  }
  const [withSpend, spent] = spendAndUpdate(mapState, moved, apCost);
  let next = updateUnit(withSpend, spent);
  next = enterRoomIfNeeded(next, spent, position);
  next = revealVisibleMonsters(next);
  return addFloat(
    addLog(
      next,
      `${unit.name} moves to ${position.x + 1},${position.y + 1}, spending ${apCost} AP${tile?.type === "trap" ? ", and triggers a trap" : ""}.`,
      unit.side === "heroes" ? "hero" : "dm",
    ),
    position,
    `-${apCost} AP`,
    "ap",
  );
};

const basicHeroAttack = (mapState: MapState, attacker: Unit, target: Unit): MapState => {
  if (!attacker.weapon || !canSpendAp(attacker, 2)) return mapState;
  if (!isValidTarget(mapState, attacker, target, attacker.weapon.range, attacker.weapon.range > 1)) {
    return addLog(mapState, "Target is out of range or out of sight.", "system");
  }

  let [next, spentAttacker] = spendAndUpdate(mapState, attacker, 2);
  next = beginPendingAttack(next, {
    attackerId: spentAttacker.id,
    targetId: target.id,
    sourceName: "Basic Attack",
    sourceKind: "basic",
    attack: basicAttackProfile(spentAttacker),
    damageDice: [attacker.weapon.die],
    flatDamage: attacker.level,
    agro: { type: "Pull", amount: 1, scope: "target" },
  });
  return next;
};

const heroCardAttackTargets = (
  mapState: MapState,
  actor: Unit,
  card: HeroCard,
  primaryTarget: Unit,
  effect: NonNullable<HeroCard["effects"][number]>,
): Unit[] => {
  if (effect.targetScope !== "visibleMonsters") return [primaryTarget];

  const maxTargets = Math.max(1, effect.value ?? 99);
  const targets = mapState.monsters
    .filter((monster) => isValidTarget(mapState, actor, monster, card.range || 99, card.requiresLos))
    .sort((a, b) => {
      if (a.id === primaryTarget.id) return -1;
      if (b.id === primaryTarget.id) return 1;
      return distance(actor.position, a.position) - distance(actor.position, b.position);
    })
    .slice(0, maxTargets);

  return targets.length ? targets : [primaryTarget];
};

const resolveHeroCard = (
  mapState: MapState,
  actor: Unit,
  card: HeroCard,
  target?: Unit,
  movePosition?: Position,
): MapState => {
  if (!canSpendAp(actor, card.cost)) return addLog(mapState, "Not enough AP for that card.", "system");
  if (card.target === "enemy" && (!target || target.side !== "dm")) return addLog(mapState, "Choose a monster target.", "system");
  if (card.target === "ally" && (!target || target.side !== "heroes")) return addLog(mapState, "Choose a hero target.", "system");
  if (target && card.range > 0 && !isValidTarget(mapState, actor, target, card.range, card.requiresLos, cardCanRevive(card))) {
    return addLog(mapState, "Card target is out of range or out of sight.", "system");
  }

  let [next, spentActor] = spendAndUpdate(mapState, actor, card.cost);
  next = addLog(next, `${actor.name} plays ${card.name}.`, actor.side === "heroes" ? "hero" : "system");
  let updatedActor = spentActor;
  let primaryTarget = target;

  for (const effect of card.effects) {
    if (effect.kind === "move") {
      const movement = effect.movement ?? actor.speed;
      if (movePosition) {
        const map = mapWithDoors(next);
        const reachable = reachableTiles(map, updatedActor, allUnits(next), movement);
        if (reachable.some((tile) => samePos(tile, movePosition))) {
          updatedActor = { ...updatedActor, position: movePosition };
          next = updateUnit(next, updatedActor);
          next = enterRoomIfNeeded(next, updatedActor, movePosition);
          next = addFloat(next, movePosition, "Rush", "ap");
        }
      }
    }

    if (effect.kind === "utility" && effect.dice) {
      updatedActor = {
        ...updatedActor,
        damageBoostDice: [...(updatedActor.damageBoostDice ?? []), ...effect.dice],
      };
      next = updateUnit(next, updatedActor);
    }

    if (effect.kind === "damage" && primaryTarget) {
      const liveTarget = getUnit(next, primaryTarget.id);
      if (!liveTarget || liveTarget.defeated) continue;
      const bonusDice =
        card.id === "berserker-execute" && liveTarget.hp <= liveTarget.maxHp / 2
          ? [...(effect.dice ?? []), "d8" as DiceExpression]
          : effect.dice ?? [];
      const dice = damageDiceForHero(updatedActor, bonusDice, cardIncludesWeapon(card));
      const onHitCondition = card.effects.find((item) => item.kind === "condition" && item.condition);
      if (card.id === "berserker-reckless-strike") {
        updatedActor = { ...updatedActor, tempDefense: (updatedActor.tempDefense ?? 0) - 1 };
        next = updateUnit(next, updatedActor);
      }
      updatedActor = { ...updatedActor, damageBoostDice: undefined };
      next = updateUnit(next, updatedActor);
      const attackTargets = heroCardAttackTargets(next, updatedActor, card, liveTarget, effect);
      return beginPendingAttack(next, {
        attackerId: updatedActor.id,
        targetIds: attackTargets.map((attackTarget) => attackTarget.id),
        sourceName: card.name,
        sourceKind: "heroCard",
        attack: card.attack ?? basicAttackProfile(updatedActor),
        damageDice: dice,
        flatDamage: updatedActor.level + (effect.flat ?? 0),
        ignoreDefense: effect.ignoreDefense,
        agro: card.agro,
        onHitCondition: onHitCondition?.condition
          ? {
              type: onHitCondition.condition,
              duration: onHitCondition.duration ?? 1,
              value: onHitCondition.value,
            }
          : undefined,
      });
    }

    if (effect.kind === "heal") {
      const healTargets =
        effect.targetScope === "allHeroesNear"
          ? next.heroes.filter((hero) => distance(actor.position, hero.position) <= card.range)
          : primaryTarget
            ? [primaryTarget]
            : [updatedActor];
      return beginPendingDiceRoll(next, {
        kind: "heal",
        label: card.name,
        dice: effect.dice ?? [],
        flat: updatedActor.power,
        actorId: updatedActor.id,
        targetIds: healTargets.map((healTarget) => healTarget.id),
        revive: effect.revive,
        agro: card.agro,
      });
    }

    if (effect.kind === "defense") {
      const defenseTargets =
        effect.targetScope === "adjacentAllies"
          ? next.heroes.filter((hero) => distance(actor.position, hero.position) <= 1)
          : primaryTarget
            ? [primaryTarget]
            : [updatedActor];
      if (effect.dice?.length) {
        return beginPendingDiceRoll(next, {
          kind: "defense",
          label: card.name,
          dice: effect.dice,
          flat: 0,
          actorId: updatedActor.id,
          targetIds: defenseTargets.map((item) => item.id),
          agro: card.agro,
        });
      }
      defenseTargets.forEach((defenseTarget) => {
        const liveTarget = getUnit(next, defenseTarget.id);
        if (!liveTarget) return;
        let updated = liveTarget;
        if (effect.value) {
          updated = { ...updated, tempDefense: (updated.tempDefense ?? 0) + effect.value };
        }
        next = updateUnit(next, updated);
        next = addFloat(next, updated.position, "Guard", "ap");
      });
    }

    if (effect.kind === "condition" && primaryTarget && effect.condition) {
      const liveTarget = getUnit(next, primaryTarget.id);
      if (liveTarget) {
        const updated = addCondition(liveTarget, effect.condition, effect.duration ?? 1, effect.value);
        next = updateUnit(next, updated);
        next = addFloat(next, updated.position, effect.condition, "agro");
      }
    }

    if (effect.kind === "utility" && card.id === "cleric-cleanse" && primaryTarget) {
      const liveTarget = getUnit(next, primaryTarget.id);
      if (liveTarget) next = updateUnit(next, removeOneCondition(liveTarget));
    }
  }

  next = applyCardAgro(next, updatedActor, card, primaryTarget);
  return { ...next, selectedCardId: null, actionMode: "select" };
};

const resolveMonsterAction = (
  mapState: MapState,
  actor: Unit,
  action: MonsterAction,
  target?: Unit,
  movePosition?: Position,
): MapState => {
  if (!canSpendAp(actor, action.cost)) return addLog(mapState, "Monster lacks AP.", "system");
  let startingMapState = mapState;
  let actingMonster = actor;
  let legalTarget = target;

  if (action.target === "enemy") {
    if (!target || target.side !== "heroes") return addLog(mapState, "Choose a hero target.", "system");
    const enforced = enforceMonsterTargeting(mapState, actor, action, target);
    if (enforced.error) return addLog(mapState, enforced.error, "system");
    startingMapState = enforced.mapState;
    actingMonster = enforced.actor;
    legalTarget = enforced.target;
  } else if (target && !isValidTarget(mapState, actor, target, action.range, action.requiresLos)) {
    return addLog(mapState, "Monster action target is out of range or out of sight.", "system");
  }

  let [next, spentActor] = spendAndUpdate(startingMapState, actingMonster, action.cost);
  let updatedActor = spentActor;
  target = legalTarget;
  next = addLog(next, `${actingMonster.name} uses ${action.name}.`, "dm");

  if (action.id === "move" || action.id === "harry") {
    if (movePosition) {
      const map = mapWithDoors(next);
      const movement = action.id === "harry" ? 2 : updatedActor.speed;
      const reachable = reachableTiles(map, updatedActor, allUnits(next), movement);
      if (reachable.some((tile) => samePos(tile, movePosition))) {
        updatedActor = { ...updatedActor, position: movePosition };
        next = updateUnit(next, updatedActor);
      }
    }
    return { ...next, selectedMonsterActionId: null, actionMode: "select" };
  }

  if (action.id === "ritual") {
    const ritualBonus = getDmUpgradeActive(mapState, "dark-ritualist") ? 1 : 0;
    next = {
      ...next,
      doom: next.doom + 2 + ritualBonus,
      objectives: {
        ...next.objectives,
        ritualProgress: (next.objectives.ritualProgress ?? 0) + 1,
      },
    };
    return addFloat({ ...next, selectedMonsterActionId: null, actionMode: "select" }, actor.position, "+Doom", "doom");
  }

  if (action.id === "dark-mend") {
    return beginPendingDiceRoll(next, {
      kind: "heal",
      label: action.name,
      dice: ["d8"],
      flat: 0,
      actorId: updatedActor.id,
      targetIds: [updatedActor.id],
    });
  }

  if (action.id === "roar") {
    const roarTarget =
      target ??
      next.heroes.find((hero) => hero.id === updatedActor.agro?.currentTargetId) ??
      next.heroes.find((hero) => !hero.downed);
    if (roarTarget) {
      const updated = { ...roarTarget, ap: Math.max(0, roarTarget.ap - 1) };
      next = updateUnit(next, updated);
      next = addFloat(next, updated.position, "-1 AP", "ap");
    }
    return { ...next, selectedMonsterActionId: null, actionMode: "select" };
  }

  if (action.id === "smash-forward" || action.id === "pounce") {
    if (target) {
      const movement = action.id === "pounce" ? 5 : 3;
      const step = stepToward(mapWithDoors(next), updatedActor, target.position, allUnits(next), movement);
      updatedActor = { ...updatedActor, position: step };
      next = updateUnit(next, updatedActor);
    }
  }

  if (action.target === "allAdjacentEnemies") {
    const primaryId = legalMonsterTargetIds(next, updatedActor, 1, false)[0];
    const primaryTarget = primaryId ? next.heroes.find((hero) => hero.id === primaryId) : undefined;
    if (primaryTarget && updatedActor.agro?.currentTargetId && updatedActor.agro.currentTargetId !== primaryTarget.id) {
      updatedActor = { ...updatedActor, agro: { currentTargetId: primaryTarget.id, pressure: 0 } };
      next = addLog(
        updateUnit(next, updatedActor),
        `${updatedActor.name}'s Current Target is not adjacent, so it lashes at ${primaryTarget.name} and Pressure drops to 0.`,
        "dm",
      );
    }
    const effect = action.effects.find((item) => item.kind === "damage");
    const adjacent = next.heroes
      .filter((hero) => !hero.downed && distance(updatedActor.position, hero.position) <= 1)
      .sort((a, b) => (a.id === primaryTarget?.id ? -1 : b.id === primaryTarget?.id ? 1 : 0))
      .slice(0, effect?.value ?? 2);
    const firstTarget = adjacent[0];
    if (!firstTarget) return addLog(next, "No adjacent hero is available for that attack.", "system");
    return beginPendingAttack(next, {
      attackerId: updatedActor.id,
      targetIds: adjacent.map((hero) => hero.id),
      sourceName: action.name,
      sourceKind: "monsterAction",
      attack: action.attack ?? basicAttackProfile(updatedActor),
      damageDice: effect?.dice ?? ["d6"],
      flatDamage: effect?.flat ?? 2,
    });
  } else if (target) {
    const liveTarget = getUnit(next, target.id);
    if (liveTarget) {
      const effect = action.effects.find((item) => item.kind === "damage");
      const condition = action.effects.find((item) => item.kind === "condition");
      if (effect) {
        const pounceBonus =
          action.id === "pounce" && getDmUpgradeActive(mapState, "vicious-hounds") ? 1 : 0;
        return beginPendingAttack(next, {
          attackerId: updatedActor.id,
          targetId: liveTarget.id,
          sourceName: action.name,
          sourceKind: "monsterAction",
          attack: action.attack ?? basicAttackProfile(updatedActor),
          damageDice: effect.dice ?? [],
          flatDamage: (effect.flat ?? 0) + pounceBonus,
          onHitCondition: condition?.condition
            ? {
                type: condition.condition,
                duration: condition.duration ?? 1,
                value: condition.value,
              }
            : undefined,
        });
      }
      if (condition?.condition) {
        const updated = addCondition(liveTarget, condition.condition, condition.duration ?? 1, condition.value);
        next = updateUnit(next, updated);
        next = addFloat(next, updated.position, condition.condition, "agro");
      }
    }
  }

  return { ...next, selectedMonsterActionId: null, actionMode: "select" };
};

const getDmUpgradeActive = (mapState: MapState, upgradeId: string): boolean => {
  const saved = loadSnapshot();
  return Boolean(saved?.campaign.dm.upgrades.includes(upgradeId));
};

const resolveDmCard = (mapState: MapState, cardId: string, target?: Unit): MapState => {
  const card = dmCardById[cardId];
  if (!card) return mapState;
  if (mapState.dmCardPlayedThisRound && card.id !== "blood-price") {
    return addLog(mapState, "The DM has already played a Dungeon card this round.", "system");
  }
  if (mapState.doom < card.cost) return addLog(mapState, "Not enough Doom.", "system");

  let next: MapState = {
    ...mapState,
    doom: mapState.doom - card.cost,
    dmHand: mapState.dmHand.filter((id) => id !== cardId),
    dmDiscard: [cardId, ...mapState.dmDiscard],
    dmCardPlayedThisRound: card.id === "blood-price" ? mapState.dmCardPlayedThisRound : true,
    selectedDmCardId: null,
    actionMode: "select",
  };
  next = addLog(next, `The Dungeon Master plays ${card.name}.`, "dm");

  if (card.id === "blood-price") {
    next = { ...next, doom: next.doom + 2 };
    return addFloat(next, { x: 0, y: 0 }, "+2 Doom", "doom");
  }

  if (!target && card.target !== "none") return addLog(next, "Choose a valid target for that DM card.", "system");

  if (target?.side === "dm") {
    if (card.id === "sudden-lunge") {
      const nearest = next.heroes
        .filter((hero) => !hero.downed)
        .sort((a, b) => distance(target.position, a.position) - distance(target.position, b.position))[0];
      const moved = nearest
        ? { ...target, position: stepToward(mapWithDoors(next), target, nearest.position, allUnits(next), 3) }
        : target;
      next = updateUnit(next, moved);
      next = addFloat(next, moved.position, "Lunge", "doom");
    }
    if (card.id === "brutal-focus") {
      next = updateUnit(next, { ...target, damageBoostDice: [...(target.damageBoostDice ?? []), "d6"] });
      next = addFloat(next, target.position, "+d6", "doom");
    }
    if (card.id === "unstable-agro" && target.agro) {
      next = updateUnit(next, {
        ...target,
        agro: { ...target.agro, pressure: Math.max(0, target.agro.pressure - 1) },
      });
    }
    if (card.id === "ignore-the-pain") {
      return beginPendingDiceRoll(next, {
        kind: "defense",
        label: card.name,
        dice: ["d8"],
        flat: 0,
        targetIds: [target.id],
      });
    }
    if (card.id === "reinforced-hide") {
      next = updateUnit(next, { ...target, tempDefense: (target.tempDefense ?? 0) + 2 });
    }
    if (card.id === "dark-command") {
      next = updateUnit(next, { ...target, ap: Math.min(target.maxAp, target.ap + 2) });
      next = addFloat(next, target.position, "+2 AP", "ap");
    }
    if (card.id === "roaring-threat" && target.agro) {
      const nearestAdjacent = next.heroes
        .filter((hero) => !hero.downed && distance(hero.position, target.position) <= 1)
        .sort((a, b) => distance(target.position, a.position) - distance(target.position, b.position))[0];
      const nearest = nearestAdjacent ?? next.heroes.filter((hero) => !hero.downed)[0];
      if (nearest) {
        next = updateUnit(next, {
          ...target,
          agro: { currentTargetId: nearest.id, pressure: 1 },
        });
      }
    }
    if (card.id === "killer-instinct") {
      const cleric = next.heroes.find((hero) => hero.classId === "cleric" && !hero.downed);
      if (cleric && target.agro) {
        next = updateUnit(next, { ...target, agro: { currentTargetId: cleric.id, pressure: 0 } });
      }
    }
    if (card.id === "hidden-snare") {
      next = addLog(next, "A hidden snare is armed near the selected monster. Use trap tiles as the assisted marker.", "dm");
    }
  }

  return next;
};

const maybeAutoResolve = (mapState: MapState): MapState => {
  const map = currentMapDefinition(mapState);
  const complete =
    map.objective.type === "defeatBoss"
      ? mapState.objectives.bossDefeated
      : map.objective.type === "relicToExit"
        ? mapState.objectives.relicEscaped
        : (mapState.objectives.anchorsSealed ?? 0) >= (map.objective.required ?? 3);
  if (!complete) return mapState;
  return addLog(mapState, "Hero objective complete. Resolve the map when ready.", "system");
};

export const useGameStore = create<GameStore>((set, get) => ({
  screen: "title",
  campaign: null,
  mapState: null,
  settings: loadSettings(),
  helpOpen: false,
  heroSelections: {},
  dmUpgradeSelection: undefined,

  startNewCampaign: () => {
    const campaign = createInitialCampaign();
    saveSnapshot(campaign, null, "campaign");
    set({
      campaign,
      mapState: null,
      screen: "campaign",
      heroSelections: {},
      dmUpgradeSelection: undefined,
    });
  },

  continueCampaign: () => {
    const snapshot = loadSnapshot();
    if (!snapshot) return;
    const campaign = normalizeCampaignForCurrentData(snapshot.campaign);
    const mapState = snapshot.mapState ? normalizeInitiativeState(snapshot.mapState) : null;
    saveSnapshot(campaign, mapState, snapshot.screen === "title" ? "campaign" : snapshot.screen);
    set({
      campaign,
      mapState,
      screen: snapshot.screen === "title" ? "campaign" : snapshot.screen,
      heroSelections: {},
      dmUpgradeSelection: undefined,
    });
  },

  resetCampaign: () => {
    clearCampaign();
    set({ campaign: null, mapState: null, screen: "title" });
  },

  syncDataDefinitions: () => {
    const { campaign, mapState, screen } = get();
    if (!campaign) return;
    const needsSync = heroTemplates.some((hero) =>
      hero.startingCards.some(
        (cardId) => !campaign.heroes[hero.id]?.learnedCardIds.includes(cardId),
      ),
    );
    const normalizedCampaign = needsSync ? normalizeCampaignForCurrentData(campaign) : campaign;
    const normalizedMapState = mapState ? normalizeInitiativeState(mapState) : mapState;
    const mapChanged = normalizedMapState !== mapState;
    if (!needsSync && !mapChanged) return;
    saveSnapshot(normalizedCampaign, normalizedMapState, screen);
    set({ campaign: normalizedCampaign, mapState: normalizedMapState });
  },

  setScreen: (screen) => {
    const { campaign, mapState } = get();
    saveSnapshot(campaign, mapState, screen);
    set({ screen });
  },

  toggleHelp: () => set((state) => ({ helpOpen: !state.helpOpen })),

  dismissRoomNarration: () =>
    set((state) => {
      if (!state.mapState) return state;
      const mapState = { ...state.mapState, roomNarration: undefined };
      saveSnapshot(state.campaign, mapState, state.screen);
      return { mapState };
    }),

  dismissRandomEncounter: () =>
    set((state) => {
      if (!state.mapState) return state;
      const mapState = { ...state.mapState, activeRandomEncounter: undefined };
      saveSnapshot(state.campaign, mapState, state.screen);
      return { mapState };
    }),

  toggleDebug: () => {
    const settings = { ...get().settings, debug: !get().settings.debug };
    saveSettings(settings);
    set({ settings });
  },

  startCurrentMap: () => {
    const campaign = get().campaign;
    if (!campaign) return;
    const normalizedCampaign = normalizeCampaignForCurrentData(campaign);
    const mapState = withActivationStartState(setupMapState(normalizedCampaign));
    saveSnapshot(normalizedCampaign, mapState, "tactical");
    set({ campaign: normalizedCampaign, mapState, screen: "tactical" });
  },

  selectUnit: (unitId) =>
    set((state) => (state.mapState ? { mapState: { ...state.mapState, selectedUnitId: unitId } } : state)),

  setActionMode: (mode) =>
    set((state) =>
      state.mapState
        ? {
            mapState: {
              ...state.mapState,
              actionMode: mode,
              selectedCardId: mode === "card" ? state.mapState.selectedCardId : null,
              selectedMonsterActionId:
                mode === "monsterAction" ? state.mapState.selectedMonsterActionId : null,
            },
          }
        : state,
    ),

  selectHeroCard: (cardId) =>
    set((state) =>
      state.mapState
        ? {
            mapState: {
              ...state.mapState,
              selectedCardId: cardId,
              actionMode: cardId ? "card" : "select",
            },
          }
        : state,
    ),

  selectMonsterAction: (actionId) =>
    set((state) =>
      state.mapState
        ? {
            mapState: {
              ...state.mapState,
              selectedMonsterActionId: actionId,
              actionMode: actionId ? "monsterAction" : "select",
            },
          }
        : state,
    ),

  selectDmCard: (cardId) =>
    set((state) =>
      state.mapState
        ? {
            mapState: {
              ...state.mapState,
              selectedDmCardId: cardId,
              actionMode: cardId ? "dmCard" : "select",
            },
          }
        : state,
    ),

  boardClick: (position) =>
    set((state) => {
      const mapState = state.mapState;
      if (!mapState) return state;
      const active = getActiveUnit(mapState);
      const rawClickedUnit = unitAt(mapState, position);
      const clickedUnit = rawClickedUnit && isUnitRevealed(mapState, rawClickedUnit) ? rawClickedUnit : undefined;
      let next = mapState;

      if (!active || mapState.actionMode === "select") {
        return {
          mapState: {
            ...mapState,
            selectedUnitId: clickedUnit?.id ?? mapState.selectedUnitId,
          },
        };
      }

      if (mapState.actionMode === "move") {
        next = moveUnitTo(mapState, active, position);
      }

      if (mapState.actionMode === "attack" && clickedUnit?.side === "dm" && active.side === "heroes") {
        next = basicHeroAttack(mapState, active, clickedUnit);
      }

      if (mapState.actionMode === "interact") {
        const map = mapWithDoors(mapState);
        const tile = getTile(map, position);
        if (!tile || distance(active.position, position) > 1 || !canSpendAp(active, 1)) {
          next = addLog(mapState, "Nothing in reach to interact with.", "system");
        } else {
          const [withSpend, spent] = spendAndUpdate(mapState, active, 1);
          next = withSpend;
          if (tile.type === "door") {
            next = {
              ...next,
              doorsOpened: Array.from(new Set([...next.doorsOpened, posKey(tile)])),
            };
            next = addLog(next, `${spent.name} opens ${tile.label ?? "a door"}.`, "hero");
            next = revealVisibleMonsters(next);
          }
          if (tile.type === "altar" && map.objective.type === "relicToExit") {
            next = {
              ...next,
              objectives: {
                ...next.objectives,
                relicRecovered: true,
                relicCarrierId: spent.id,
              },
            };
            next = addLog(next, `${spent.name} claims the cursed relic.`, "hero");
          }
          if (tile.type === "exit" && next.objectives.relicCarrierId === spent.id) {
            next = {
              ...next,
              objectives: { ...next.objectives, relicEscaped: true },
            };
          }
          if (tile.type === "anchor") {
            const key = posKey(tile);
            if (!next.objectives.sealedAnchorKeys?.includes(key)) {
              next = {
                ...next,
                objectives: {
                  ...next.objectives,
                  anchorsSealed: (next.objectives.anchorsSealed ?? 0) + 1,
                  sealedAnchorKeys: [...(next.objectives.sealedAnchorKeys ?? []), key],
                },
              };
              next = addLog(next, `${spent.name} seals ${tile.label ?? "an anchor"}.`, "hero");
            }
          }
        }
      }

      if (mapState.actionMode === "card") {
        const card = mapState.selectedCardId ? heroCardById[mapState.selectedCardId] : undefined;
        if (card && active.side === "heroes") {
          const moveEffect = card.effects.find((effect) => effect.kind === "move");
          const movePosition = moveEffect && !clickedUnit ? position : undefined;
          next = resolveHeroCard(mapState, active, card, clickedUnit, movePosition);
        }
      }

      if (mapState.actionMode === "monsterAction") {
        const action = mapState.selectedMonsterActionId
          ? monsterTemplateById[active.templateId]?.actions.find(
              (item) => item.id === mapState.selectedMonsterActionId,
            )
          : undefined;
        if (action && active.side === "dm") {
          const movePosition =
            ["move", "harry"].includes(action.id) && !clickedUnit ? position : undefined;
          next = resolveMonsterAction(mapState, active, action, clickedUnit, movePosition);
        }
      }

      if (mapState.actionMode === "dmCard" && mapState.selectedDmCardId) {
        next = resolveDmCard(mapState, mapState.selectedDmCardId, clickedUnit);
      }

      next = maybeAutoResolve(next);
      next = autoEndActivationIfSpent(next, state.campaign, active.id);
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  playSelectedCardOnActive: () =>
    set((state) => {
      const mapState = state.mapState;
      const active = mapState ? getActiveUnit(mapState) : undefined;
      const card = mapState?.selectedCardId ? heroCardById[mapState.selectedCardId] : undefined;
      if (!mapState || !active || !card) return state;
      let next = resolveHeroCard(mapState, active, card, active);
      next = autoEndActivationIfSpent(next, state.campaign, active.id);
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  playSelectedMonsterAction: () =>
    set((state) => {
      const mapState = state.mapState;
      const active = mapState ? getActiveUnit(mapState) : undefined;
      const action = active && mapState?.selectedMonsterActionId
        ? monsterTemplateById[active.templateId]?.actions.find((item) => item.id === mapState.selectedMonsterActionId)
        : undefined;
      if (!mapState || !active || !action) return state;
      let next = resolveMonsterAction(mapState, active, action);
      next = autoEndActivationIfSpent(next, state.campaign, active.id);
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  playSelectedDmCard: () =>
    set((state) => {
      const mapState = state.mapState;
      if (!mapState?.selectedDmCardId) return state;
      const next = resolveDmCard(mapState, mapState.selectedDmCardId);
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  rollPendingHit: () =>
    set((state) => {
      const mapState = state.mapState;
      const pending = mapState?.pendingAttack;
      if (!mapState || !pending || pending.stage !== "hit") return state;
      const attacker = getUnit(mapState, pending.attackerId);
      const target = getUnit(mapState, pending.targetId);
      if (!attacker || !target) return state;

      const roll = rollDice(`${pending.sourceName} Attack`, ["d20"]);
      const natural = roll.dice[0]?.result ?? roll.total;
      const accuracy = attacker.accuracy;
      const cardModifier = pending.attack.accuracyModifier;
      const total = natural + accuracy + cardModifier;
      const criticalBonus = clampRollBonus(pending.attack.criticalBonus);
      const fumbleBonus = clampRollBonus(pending.attack.fumbleBonus);
      const fumble = natural <= 1 + fumbleBonus;
      const critical = !fumble && natural >= 20 - criticalBonus;
      const hit = critical || total >= target.dt;
      const outcome: AttackRollResult["outcome"] = fumble
        ? "Critical Failure"
        : critical
          ? "Critical Hit"
          : hit
            ? "Hit"
            : "Miss";
      const hitRoll = {
        natural,
        accuracy,
        cardModifier,
        total,
        targetDT: target.dt,
        criticalBonus,
        fumbleBonus,
        outcome,
        critical,
        fumble,
      };
      const attackLine = `Attack roll: d20 ${natural} + Accuracy ${accuracy} + Card ${cardModifier} = ${total} vs DT ${target.dt}`;
      let next = addDice(mapState, roll);

      if (fumble) {
        next = applyCriticalFailure(next, attacker, target, pending, attackLine);
        next = advancePendingAttack(next, pending);
        next = autoEndActivationIfSpent(next, state.campaign, pending.attackerId);
        saveSnapshot(state.campaign, next, state.screen);
        return { mapState: next };
      }

      if (!hit) {
        next = applyAttackAgro(next, attacker, target, pending.agro, "miss");
        next = addFloat(next, target.position, "MISS", "ap");
        next = addRollBanner(next, "MISS", `${natural} + ${accuracy + cardModifier} = ${total} vs DT ${target.dt}`, "miss");
        next = addLog(
          next,
          `${attacker.name} uses ${pending.sourceName} on ${target.name}. ${attackLine}. Miss. No damage.${
            pending.agro?.type === "Pull" ? " Half Pull applies." : ""
          }`,
          "damage",
        );
        next = advancePendingAttack(next, pending);
        next = autoEndActivationIfSpent(next, state.campaign, pending.attackerId);
        saveSnapshot(state.campaign, next, state.screen);
        return { mapState: next };
      }

      next = addFloat(next, target.position, critical ? "CRITICAL HIT" : "HIT", critical ? "doom" : "ap");
      next = addRollBanner(
        next,
        critical ? "CRITICAL HIT" : "HIT",
        `${natural} + ${accuracy + cardModifier} = ${total} vs DT ${target.dt}`,
        critical ? "critical" : "hit",
      );
      next = addLog(
        next,
        `${attacker.name} uses ${pending.sourceName} on ${target.name}. ${attackLine}. ${outcome}. Roll damage.`,
        "damage",
      );
      next = {
        ...next,
        pendingAttack: {
          ...pending,
          stage: "damage",
          hitRoll,
        },
      };
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  rollPendingDamage: () =>
    set((state) => {
      const mapState = state.mapState;
      const pending = mapState?.pendingAttack;
      if (!mapState || !pending || pending.stage !== "damage" || !pending.hitRoll) return state;
      const attacker = getUnit(mapState, pending.attackerId);
      const target = getUnit(mapState, pending.targetId);
      if (!attacker || !target) return state;

      const roll = rollDice(`${pending.sourceName} Damage`, pending.damageDice, pending.flatDamage);
      const rawDamage = roll.total;
      const criticalMultiplier = pending.hitRoll.critical ? 2 : 1;
      const multipliedDamage = rawDamage * criticalMultiplier;
      const defenseReduction = Math.max(0, effectiveDefense(target) - (pending.ignoreDefense ?? 0));
      const temporaryReduction = target.defending ?? 0;
      const finalDamage = Math.max(0, multipliedDamage - defenseReduction - temporaryReduction);
      const hp = Math.max(0, target.hp - finalDamage);
      const updatedTarget: Unit = {
        ...target,
        hp,
        downed: target.side === "heroes" && hp === 0,
        defeated: target.side === "dm" && hp === 0,
        defending: undefined,
      };
      let next = updateUnit(mapState, updatedTarget);
      next = maybeApplyMapObjectivesAfterDamage(next, target, updatedTarget);

      if (pending.onHitCondition && !updatedTarget.defeated && !updatedTarget.downed) {
        next = updateUnit(
          next,
          addCondition(
            getUnit(next, updatedTarget.id)!,
            pending.onHitCondition.type,
            pending.onHitCondition.duration,
            pending.onHitCondition.value,
          ),
        );
      }

      next = addDice(next, roll);
      next = addFloat(
        next,
        target.position,
        `${pending.hitRoll.critical ? "CRIT " : ""}-${finalDamage}`,
        pending.hitRoll.critical ? "doom" : "damage",
      );
      next = addRollBanner(
        next,
        pending.hitRoll.critical ? `${finalDamage} CRITICAL DAMAGE` : `${finalDamage} DAMAGE`,
        pending.hitRoll.critical
          ? `Raw ${rawDamage} doubled to ${multipliedDamage}, then reduced by ${defenseReduction}.`
          : `Raw ${rawDamage}, reduced by ${defenseReduction}.`,
        pending.hitRoll.critical ? "critical" : "damage",
      );
      next = applyAttackAgro(next, attacker, getUnit(next, target.id) ?? updatedTarget, pending.agro, "hit");
      if (pending.hitRoll.critical) {
        next = applyAttackAgro(next, attacker, getUnit(next, target.id) ?? updatedTarget, pending.agro, "critical");
      }
      const diceText = roll.dice.map((die) => `d${die.sides} ${die.result}`).join(" + ");
      const attackLine = `Attack roll: d20 ${pending.hitRoll.natural} + Accuracy ${pending.hitRoll.accuracy} + Card ${pending.hitRoll.cardModifier} = ${pending.hitRoll.total} vs DT ${pending.hitRoll.targetDT}.`;
      next = addLog(
        next,
        `${attacker.name} uses ${pending.sourceName} on ${target.name}. ${attackLine} ${pending.hitRoll.outcome}. Damage roll: ${diceText}${pending.flatDamage ? ` + ${pending.flatDamage}` : ""} = ${rawDamage}${
          pending.hitRoll.critical ? `, doubled to ${multipliedDamage}` : ""
        }, reduced by Defence ${defenseReduction}${temporaryReduction ? ` and reduction ${temporaryReduction}` : ""}, final damage ${finalDamage}.`,
        "damage",
      );
      next = advancePendingAttack(next, pending);
      next = autoEndActivationIfSpent(next, state.campaign, pending.attackerId);
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  rollPendingUtilityDice: () =>
    set((state) => {
      const mapState = state.mapState;
      const pending = mapState?.pendingDiceRoll;
      if (!mapState || !pending) return state;
      const roll = rollDice(pending.label, pending.dice, pending.flat);
      let next = addDice(mapState, roll);
      const actor = pending.actorId ? getUnit(next, pending.actorId) : undefined;

      pending.targetIds.forEach((targetId) => {
        const target = getUnit(next, targetId);
        if (!target) return;
        if (pending.kind === "heal") {
          const before = target.hp;
          const canHeal = !target.defeated && (!target.downed || pending.revive);
          const hp = canHeal ? Math.min(target.maxHp, target.hp + roll.total) : target.hp;
          const updated = { ...target, hp, downed: hp > 0 ? false : target.downed };
          next = updateUnit(next, updated);
          next = addFloat(next, updated.position, `+${hp - before}`, "heal");
          next = addRollBanner(next, `+${hp - before} HP`, pending.label, "heal");
          next = addLog(next, `${pending.label} restores ${hp - before} HP to ${updated.name}.`, "heal");
        } else if (pending.kind === "defense") {
          const updated = { ...target, defending: (target.defending ?? 0) + roll.total };
          next = updateUnit(next, updated);
          next = addFloat(next, updated.position, `Guard ${roll.total}`, "ap");
          next = addRollBanner(next, `GUARD ${roll.total}`, pending.label, "damage");
          next = addLog(next, `${pending.label} adds ${roll.total} damage reduction to ${updated.name}.`, "system");
        } else if (pending.kind === "rest") {
          const before = target.ap;
          const ap = Math.min(target.maxAp, target.ap + roll.total);
          const updated = { ...target, ap };
          next = updateUnit(next, updated);
          next = addFloat(next, updated.position, `+${ap - before} AP`, "ap");
          next = addRollBanner(next, `REST +${ap - before} AP`, `Recovery ${target.recovery} + d3 ${roll.dice[0]?.result ?? 0}`, "heal");
          next = addLog(
            next,
            `${updated.name} rests and recovers ${ap - before} AP (${target.recovery} Recovery + d3 ${roll.dice[0]?.result ?? 0}).`,
            updated.side === "heroes" ? "hero" : "dm",
          );
        }
      });

      next = applySupportAgro(next, actor, pending.agro);
      next = { ...next, pendingDiceRoll: undefined };
      next = pending.kind === "rest"
        ? advanceActivation(next, state.campaign)
        : autoEndActivationIfSpent(next, state.campaign, pending.actorId);
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  rollPendingInitiative: () =>
    set((state) => {
      const mapState = state.mapState;
      const pending = mapState?.pendingInitiativeRoll;
      if (!mapState || !pending) return state;

      const unitId = pending.unitIds[pending.rolled.length];
      const unit = getUnit(mapState, unitId);

      if (!unit || unit.defeated || unit.downed || !isUnitRevealed(mapState, unit)) {
        const remainingValidIds = pending.unitIds.filter((candidateId, index) => {
          if (index < pending.rolled.length) return true;
          const candidate = getUnit(mapState, candidateId);
          return Boolean(candidate && !candidate.defeated && !candidate.downed && isUnitRevealed(mapState, candidate));
        });
        if (remainingValidIds.length > pending.rolled.length) {
          const next = { ...mapState, pendingInitiativeRoll: { ...pending, unitIds: remainingValidIds } };
          saveSnapshot(state.campaign, next, state.screen);
          return { mapState: next };
        }
        const order = [...pending.rolled].sort(
          (a, b) => b.total - a.total || b.roll - a.roll || a.unitName.localeCompare(b.unitName),
        );
        const activeUnitId = order[0]?.unitId ?? null;
        const next = withActivationStartState(
          addLog(
            {
              ...mapState,
              initiative: { order, currentIndex: activeUnitId ? 0 : -1 },
              pendingInitiativeRoll: undefined,
              activeUnitId,
              selectedUnitId: activeUnitId,
            },
            order.length ? `Initiative order fixed: ${order.map((entry) => `${entry.unitName} ${entry.total}`).join(", ")}.` : "No revealed figures can act.",
            "system",
          ),
          activeUnitId,
        );
        saveSnapshot(state.campaign, next, state.screen);
        return { mapState: next };
      }

      const roll = rollDice(`${unit.name} Initiative`, ["d10"], unit.initiative);
      const entry: InitiativeEntry = {
        unitId: unit.id,
        unitName: unit.name,
        side: unit.side,
        roll: roll.dice[0]?.result ?? roll.total - unit.initiative,
        bonus: unit.initiative,
        total: roll.total,
      };
      const rolled = [...pending.rolled, entry];
      let next = addDice(mapState, roll);
      next = addRollBanner(next, `${unit.name}: ${entry.total}`, `d10 ${entry.roll} + Initiative ${entry.bonus}`, "hit");

      if (rolled.length < pending.unitIds.length) {
        next = {
          ...next,
          pendingInitiativeRoll: {
            ...pending,
            rolled,
          },
        };
        saveSnapshot(state.campaign, next, state.screen);
        return { mapState: next };
      }

      const order = rolled.sort(
        (a, b) => b.total - a.total || b.roll - a.roll || a.unitName.localeCompare(b.unitName),
      );
      const activeUnitId = order[0]?.unitId ?? null;
      next = withActivationStartState(
        addLog(
          {
            ...next,
            initiative: { order, currentIndex: activeUnitId ? 0 : -1 },
            pendingInitiativeRoll: undefined,
            activeUnitId,
            selectedUnitId: activeUnitId,
            selectedCardId: null,
            selectedMonsterActionId: null,
            selectedDmCardId: null,
            actionMode: "select",
          },
          `Initiative order fixed: ${order.map((item) => `${item.unitName} ${item.total}`).join(", ")}.`,
          "system",
        ),
        activeUnitId,
      );

      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  defendActive: () =>
    set((state) => {
      const mapState = state.mapState;
      const active = mapState ? getActiveUnit(mapState) : undefined;
      if (!mapState || !active || !canSpendAp(active, 1)) return state;
      let [next, spent] = spendAndUpdate(mapState, active, 1);
      spent = { ...spent, defending: (spent.defending ?? 0) + spent.defense };
      next = updateUnit(next, spent);
      if (spent.side === "heroes") {
        mapState.monsters
          .filter(
            (monster) =>
              !monster.defeated &&
              monster.agro?.currentTargetId === spent.id &&
              distance(monster.position, spent.position) <= 1,
          )
          .forEach((monster) => {
            const result = applyAgro(monster, spent.id, "Hold", 1, 1);
            if (result.changed) next = updateUnit(next, result.monster);
          });
      }
      next = addFloat(addLog(next, `${spent.name} defends.`, spent.side === "heroes" ? "hero" : "dm"), spent.position, "Guard", "ap");
      next = autoEndActivationIfSpent(next, state.campaign, spent.id);
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  restActive: () =>
    set((state) => {
      const mapState = state.mapState;
      const active = mapState ? getActiveUnit(mapState) : undefined;
      if (!mapState || !active || active.defeated || active.downed || mapState.pendingAttack || mapState.pendingDiceRoll) return state;
      if (mapState.actionTakenThisActivation) {
        const next = addLog(mapState, `${active.name} cannot rest after taking another action this activation.`, "system");
        saveSnapshot(state.campaign, next, state.screen);
        return { mapState: next };
      }
      const next = beginPendingDiceRoll(
        addLog(mapState, `${active.name} rests, giving up the rest of the activation.`, active.side === "heroes" ? "hero" : "dm"),
        {
          kind: "rest",
          label: `${active.name} Rest`,
          dice: ["d3"],
          flat: active.recovery,
          actorId: active.id,
          targetIds: [active.id],
        },
      );
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  waitActive: () =>
    set((state) => {
      const mapState = state.mapState;
      if (!mapState?.activeUnitId) return state;
      const next = waitActiveUnit(mapState);
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  endActivation: () =>
    set((state) => {
      const mapState = state.mapState;
      if (!mapState?.activeUnitId) return state;
      const next = advanceActivation(mapState, state.campaign);
      saveSnapshot(state.campaign, next, state.screen);
      return { mapState: next };
    }),

  resolveCurrentMap: () =>
    set((state) => {
      if (!state.campaign || !state.mapState) return state;
      const rewards = createMapRewards(state.campaign, state.mapState);
      const mapState = { ...state.mapState, resolved: rewards };
      const campaign = { ...state.campaign, pendingLevelUp: rewards };
      saveSnapshot(campaign, mapState, "resolution");
      return {
        campaign,
        mapState,
        screen: "resolution",
        heroSelections: {},
        dmUpgradeSelection: rewards.dmUpgradeChoices[0],
      };
    }),

  selectRewardCard: (heroId, cardId) =>
    set((state) => ({
      heroSelections: { ...state.heroSelections, [heroId]: cardId },
    })),

  selectRewardUpgrade: (upgradeId) => set({ dmUpgradeSelection: upgradeId }),

  confirmRewards: () =>
    set((state) => {
      if (!state.campaign?.pendingLevelUp) return state;
      const campaign = applyRewardsToCampaign(
        state.campaign,
        state.campaign.pendingLevelUp,
        state.heroSelections,
        state.dmUpgradeSelection,
      );
      saveSnapshot(campaign, null, "campaign");
      return {
        campaign,
        mapState: null,
        screen: "campaign",
        heroSelections: {},
        dmUpgradeSelection: undefined,
      };
    }),

  toggleHandCard: (heroId, cardId) =>
    set((state) => {
      if (!state.campaign) return state;
      const progress = state.campaign.heroes[heroId];
      if (!progress || !progress.learnedCardIds.includes(cardId)) return state;
      const inHand = progress.handCardIds.includes(cardId);
      const handCardIds = inHand
        ? progress.handCardIds.filter((id) => id !== cardId)
        : progress.handCardIds.length < 6
          ? [...progress.handCardIds, cardId]
          : progress.handCardIds;
      const campaign = {
        ...state.campaign,
        heroes: {
          ...state.campaign.heroes,
          [heroId]: { ...progress, handCardIds },
        },
      };
      saveSnapshot(campaign, state.mapState, state.screen);
      return { campaign };
    }),

  saveGame: () => {
    const { campaign, mapState, screen } = get();
    saveSnapshot(campaign, mapState, screen);
  },

  debugAddDoom: () =>
    set((state) =>
      state.mapState ? { mapState: { ...state.mapState, doom: state.mapState.doom + 3 } } : state,
    ),

  debugDamageSelected: (amount) =>
    set((state) => {
      const mapState = state.mapState;
      const selected = mapState ? getUnit(mapState, mapState.selectedUnitId) : undefined;
      if (!mapState || !selected) return state;
      const updated = {
        ...selected,
        hp: Math.max(0, selected.hp - amount),
        defeated: selected.side === "dm" && selected.hp - amount <= 0,
        downed: selected.side === "heroes" && selected.hp - amount <= 0,
      };
      return { mapState: maybeApplyMapObjectivesAfterDamage(updateUnit(mapState, updated), selected, updated) };
    }),

  debugHealSelected: (amount) =>
    set((state) => {
      const mapState = state.mapState;
      const selected = mapState ? getUnit(mapState, mapState.selectedUnitId) : undefined;
      if (!mapState || !selected) return state;
      const updated = {
        ...selected,
        hp: Math.min(selected.maxHp, selected.hp + amount),
        downed: false,
      };
      return { mapState: updateUnit(mapState, updated) };
    }),

  debugCompleteObjective: () =>
    set((state) => {
      const mapState = state.mapState;
      if (!mapState) return state;
      const map = currentMapDefinition(mapState);
      const objectives =
        map.objective.type === "defeatBoss"
          ? { ...mapState.objectives, bossDefeated: true }
          : map.objective.type === "relicToExit"
            ? { ...mapState.objectives, relicEscaped: true }
            : {
                ...mapState.objectives,
                anchorsSealed: map.objective.required ?? 3,
              };
      return { mapState: addLog({ ...mapState, objectives }, "Objective completed by debug control.", "system") };
    }),

  debugResetAp: () =>
    set((state) =>
      state.mapState
        ? {
            mapState: {
              ...state.mapState,
              heroes: state.mapState.heroes.map((unit) => ({ ...unit, ap: unit.maxAp })),
              monsters: state.mapState.monsters.map((unit) => ({ ...unit, ap: unit.maxAp })),
            },
          }
        : state,
    ),
}));

export const selectCurrentMap = (mapState: MapState | null) =>
  mapState ? mapWithDoors(mapState) : campaignMaps[0];

export const selectActiveUnit = (mapState: MapState | null) =>
  mapState ? getActiveUnit(mapState) : undefined;

export const selectSelectedUnit = (mapState: MapState | null) =>
  mapState ? getUnit(mapState, mapState.selectedUnitId) : undefined;

export const selectAllUnits = (mapState: MapState | null) => (mapState ? allUnits(mapState) : []);

export const selectReachablePositions = (mapState: MapState | null): Position[] => {
  if (!mapState) return [];
  const active = getActiveUnit(mapState);
  if (!active) return [];
  if (mapState.actionMode === "move") {
    const allowance = effectiveMovementAllowance(active, active.speed);
    return reachableTileCosts(
      mapWithDoors(mapState),
      active,
      allUnits(mapState),
      allowance * active.ap,
      { applyMovementConditions: false },
    ).map((entry) => entry.position);
  }
  if (mapState.actionMode === "card" && mapState.selectedCardId) {
    const card = heroCardById[mapState.selectedCardId];
    const moveEffect = card?.effects.find((effect) => effect.kind === "move");
    if (card && moveEffect) {
      return reachableTiles(mapWithDoors(mapState), active, allUnits(mapState), moveEffect.movement ?? active.speed);
    }
  }
  if (mapState.actionMode === "monsterAction" && mapState.selectedMonsterActionId) {
    const action = monsterTemplateById[active.templateId]?.actions.find(
      (item) => item.id === mapState.selectedMonsterActionId,
    );
    if (action && ["move", "harry"].includes(action.id)) {
      return reachableTiles(
        mapWithDoors(mapState),
        active,
        allUnits(mapState),
        action.id === "harry" ? 2 : active.speed,
      );
    }
  }
  return [];
};

export const selectValidTargetIds = (mapState: MapState | null): string[] => {
  if (!mapState) return [];
  const active = getActiveUnit(mapState);
  if (!active) return [];
  if (mapState.actionMode === "attack" && active.side === "heroes") {
    return mapState.monsters
      .filter((monster) => active.weapon && isValidTarget(mapState, active, monster, active.weapon.range, active.weapon.range > 1))
      .map((unit) => unit.id);
  }
  if (mapState.actionMode === "card" && mapState.selectedCardId) {
    const card = heroCardById[mapState.selectedCardId];
    const pool = card?.target === "ally" ? mapState.heroes : card?.target === "enemy" ? mapState.monsters : [];
    return pool
      .filter((unit) =>
        card && isValidTarget(mapState, active, unit, card.range || 99, card.requiresLos, cardCanRevive(card)),
      )
      .map((unit) => unit.id);
  }
  if (mapState.actionMode === "monsterAction" && mapState.selectedMonsterActionId) {
    const action = monsterTemplateById[active.templateId]?.actions.find(
      (item) => item.id === mapState.selectedMonsterActionId,
    );
    if (!action || action.target === "none" || action.target === "self") return [];
    if (action.target === "allAdjacentEnemies") {
      const primaryId = legalMonsterTargetIds(mapState, active, 1, false)[0];
      const maxTargets = action.effects.find((effect) => effect.kind === "damage")?.value ?? 2;
      return mapState.heroes
        .filter((hero) => !hero.downed && isValidTarget(mapState, active, hero, 1, false))
        .sort((a, b) => (a.id === primaryId ? -1 : b.id === primaryId ? 1 : 0))
        .slice(0, maxTargets)
        .map((unit) => unit.id);
    }
    return mapState.heroes
      .filter((hero) => legalMonsterTargetIds(mapState, active, action.range, action.requiresLos).includes(hero.id))
      .map((unit) => unit.id);
  }
  if (mapState.actionMode === "dmCard") {
    return mapState.monsters.filter((monster) => !monster.defeated).map((unit) => unit.id);
  }
  return [];
};
