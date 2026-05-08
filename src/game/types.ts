export type Side = "heroes" | "dm";
export type Screen =
  | "title"
  | "campaign"
  | "heroLoadout"
  | "dmLoadout"
  | "tactical"
  | "resolution";

export type HeroClass = "guardian" | "berserker" | "ranger" | "cleric";
export type TileType =
  | "void"
  | "floor"
  | "wall"
  | "door"
  | "trap"
  | "difficult"
  | "altar"
  | "exit"
  | "objective"
  | "portal"
  | "anchor";

export type CardType =
  | "Attack"
  | "Defence"
  | "Heal"
  | "Buff"
  | "Crowd Control"
  | "Reaction"
  | "Utility"
  | "Ultimate";

export type ConditionType =
  | "Slowed"
  | "Rooted"
  | "Weakened"
  | "Vulnerable"
  | "Stunned"
  | "Frozen"
  | "Blessed"
  | "Guarded"
  | "Exposed";

export type DiceExpression =
  | `${number}d${3 | 4 | 6 | 8 | 10 | 12 | 20}`
  | `d${3 | 4 | 6 | 8 | 10 | 12 | 20}`;

export interface Position {
  x: number;
  y: number;
}

export interface Stats {
  maxHp: number;
  maxAp: number;
  recovery: number;
  speed: number;
  dt: number;
  defense: number;
  initiative: number;
  accuracy: number;
  power: number;
  level: number;
}

export interface Condition {
  type: ConditionType;
  duration: number;
  value?: number;
}

export interface AgroState {
  currentTargetId: string | null;
  pressure: number;
}

export interface HeroTemplate {
  id: string;
  name: string;
  classId: HeroClass;
  role: string;
  portraitGlyph: string;
  color: string;
  stats: Stats;
  weapon: {
    name: string;
    die: DiceExpression;
    range: number;
  };
  startingCards: string[];
}

export interface MonsterTemplate {
  id: string;
  name: string;
  family: "brute" | "cult" | "beast" | "boss";
  portraitGlyph: string;
  color: string;
  stats: Omit<Stats, "power" | "level"> & { level?: number; power?: number };
  actions: MonsterAction[];
}

export interface Unit {
  id: string;
  templateId: string;
  name: string;
  side: Side;
  classId?: HeroClass;
  family?: MonsterTemplate["family"];
  portraitGlyph: string;
  color: string;
  role?: string;
  level: number;
  maxHp: number;
  hp: number;
  maxAp: number;
  ap: number;
  recovery: number;
  speed: number;
  dt: number;
  defense: number;
  initiative: number;
  accuracy: number;
  power: number;
  weapon?: HeroTemplate["weapon"];
  position: Position;
  conditions: Condition[];
  activated: boolean;
  downed?: boolean;
  defeated?: boolean;
  defending?: number;
  damageBoostDice?: DiceExpression[];
  tempDefense?: number;
  resistance?: number;
  agro?: AgroState;
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  room?: string;
  label?: string;
  open?: boolean;
  revealed?: boolean;
}

export interface RoomDefinition {
  id: string;
  name: string;
  description: string;
}

export interface MapDefinition {
  id: string;
  name: string;
  subtitle: string;
  size: { width: number; height: number };
  tiles: Tile[];
  rooms: RoomDefinition[];
  heroStarts: Position[];
  monsters: Array<{
    templateId: string;
    id: string;
    position: Position;
    variantName?: string;
    hpBonus?: number;
    objectiveMonster?: boolean;
  }>;
  objective: {
    hero: string;
    dm: string;
    type: "defeatBoss" | "relicToExit" | "sealAnchors";
    required?: number;
    roundLimit?: number;
  };
  escalation?: {
    max: number;
    label: string;
  };
}

export interface CardEffect {
  kind:
    | "damage"
    | "heal"
    | "defense"
    | "move"
    | "condition"
    | "agro"
    | "reaction"
    | "utility";
  dice?: DiceExpression[];
  flat?: number;
  condition?: ConditionType;
  value?: number;
  duration?: number;
  movement?: number;
  revive?: boolean;
  ignoreDefense?: number;
  targetScope?: "target" | "visibleMonsters" | "adjacentAllies" | "allHeroesNear";
}

export interface AttackProfile {
  accuracyModifier: number;
  criticalBonus: number;
  fumbleBonus: number;
  hitType: "melee" | "ranged" | "magic" | "melee_or_weapon";
  requiresAttackRoll: true;
  targetDT: "dt";
}

export interface HeroCard {
  id: string;
  name: string;
  classId: HeroClass;
  level: number;
  cost: number;
  type: CardType;
  range: number;
  target: "enemy" | "ally" | "self" | "any" | "none";
  requiresLos?: boolean;
  text: string;
  agro?: {
    type: "Pull" | "Hold" | "Set Target" | "none";
    amount: number;
    pressure?: number;
    scope?: "target" | "visibleMonsters" | "adjacentMonsters";
  };
  attack?: AttackProfile;
  effects: CardEffect[];
  icon: string;
  animation: "slash" | "arrow" | "radiance" | "guard" | "shadow" | "surge";
}

export interface MonsterAction {
  id: string;
  name: string;
  cost: number;
  range: number;
  target: "enemy" | "self" | "allAdjacentEnemies" | "none";
  requiresLos?: boolean;
  text: string;
  effects: CardEffect[];
  attack?: AttackProfile;
  icon: string;
}

export interface DMCard {
  id: string;
  name: string;
  cost: number;
  trigger?: string;
  text: string;
  target: "monster" | "hero" | "agroMonster" | "none";
  icon: string;
}

export type RandomEncounterKind = "monster" | "treasure" | "npc";

export interface RandomEncounterEffect {
  kind: RandomEncounterKind;
  monsterTemplateId?: string;
  count?: number;
  healAll?: number;
  apAll?: number;
  defenseAll?: number;
  doomDelta?: number;
  condition?: ConditionType;
  conditionDuration?: number;
  conditionValue?: number;
}

export interface RandomEncounterCard {
  id: string;
  name: string;
  kind: RandomEncounterKind;
  disposition?: "good" | "bad";
  rarity: "common" | "uncommon" | "rare";
  text: string;
  effectText: string;
  icon: string;
  effect: RandomEncounterEffect;
}

export interface RandomEncounterReveal {
  id: string;
  cardId: string;
  effectSummary: string;
}

export interface DMUpgrade {
  id: string;
  name: string;
  level?: number;
  specialization?: "Beastmaster" | "Necromancer" | "Trapwright" | "Tyrant" | "Corrupter";
  text: string;
}

export interface HeroProgress {
  heroId: string;
  level: number;
  scars: number;
  boons: string[];
  learnedCardIds: string[];
  handCardIds: string[];
}

export interface DMProgress {
  level: number;
  dread: number;
  upgrades: string[];
  unlockedCardIds: string[];
  deckCardIds: string[];
  specialization?: DMUpgrade["specialization"];
}

export interface CampaignState {
  id: string;
  name: string;
  currentMapIndex: number;
  glory: number;
  dread: number;
  heroes: Record<string, HeroProgress>;
  dm: DMProgress;
  completedMaps: string[];
  pendingLevelUp?: PendingRewards;
  lastSavedAt?: number;
}

export interface PendingRewards {
  mapId: string;
  heroObjectiveComplete: boolean;
  dmSchemeComplete: boolean;
  glory: number;
  dread: number;
  scars: Record<string, number>;
  heroChoices: Record<string, string[]>;
  dmUpgradeChoices: string[];
}

export interface InitiativeState {
  order: InitiativeEntry[];
  currentIndex: number;
}

export interface InitiativeEntry {
  unitId: string;
  unitName: string;
  side: Side;
  roll: number;
  bonus: number;
  total: number;
}

export interface PendingInitiativeRoll {
  id: string;
  round: number;
  unitIds: string[];
  rolled: InitiativeEntry[];
}

export interface GameLogEntry {
  id: string;
  round: number;
  text: string;
  tone: "hero" | "dm" | "system" | "damage" | "heal";
}

export interface DiceRoll {
  id: string;
  label: string;
  dice: Array<{ sides: number; result: number }>;
  total: number;
}

export interface FloatingText {
  id: string;
  position: Position;
  text: string;
  tone: "damage" | "heal" | "ap" | "agro" | "doom";
}

export interface RollBanner {
  id: string;
  text: string;
  detail: string;
  tone: "hit" | "miss" | "critical" | "fumble" | "damage" | "heal";
}

export interface RoomNarration {
  id: string;
  roomId: string;
  name: string;
  text: string;
}

export interface AttackRollResult {
  natural: number;
  accuracy: number;
  cardModifier: number;
  total: number;
  targetDT: number;
  criticalBonus: number;
  fumbleBonus: number;
  outcome: "Hit" | "Miss" | "Critical Hit" | "Critical Failure";
  critical: boolean;
  fumble: boolean;
}

export interface PendingAttack {
  id: string;
  stage: "hit" | "damage";
  attackerId: string;
  targetId: string;
  remainingTargetIds?: string[];
  targetIndex?: number;
  totalTargets?: number;
  sourceName: string;
  sourceKind: "basic" | "heroCard" | "monsterAction";
  attack: AttackProfile;
  damageDice: DiceExpression[];
  flatDamage: number;
  ignoreDefense?: number;
  agro?: HeroCard["agro"];
  onHitCondition?: {
    type: ConditionType;
    duration: number;
    value?: number;
  };
  hitRoll?: AttackRollResult;
}

export interface PendingDiceRoll {
  id: string;
  kind: "heal" | "defense" | "rest";
  label: string;
  dice: DiceExpression[];
  flat: number;
  actorId?: string;
  targetIds: string[];
  revive?: boolean;
  agro?: HeroCard["agro"];
}

export interface MapState {
  mapId: string;
  round: number;
  doom: number;
  escalation: number;
  initiative: InitiativeState;
  activeUnitId: string | null;
  selectedUnitId: string | null;
  selectedCardId: string | null;
  selectedMonsterActionId: string | null;
  selectedDmCardId: string | null;
  actionMode: "select" | "move" | "attack" | "interact" | "card" | "monsterAction" | "dmCard";
  actionTakenThisActivation: boolean;
  noRevealedMonstersAtActivationStart: boolean;
  monsterDefeatedThisActivation: boolean;
  monsterDefeatedThisRound: boolean;
  heroes: Unit[];
  monsters: Unit[];
  doorsOpened: string[];
  objectives: {
    bossDefeated?: boolean;
    relicCarrierId?: string | null;
    relicRecovered?: boolean;
    relicEscaped?: boolean;
    anchorsSealed?: number;
    sealedAnchorKeys?: string[];
    heroDowns?: number;
    scarredHeroIds?: string[];
    ritualProgress?: number;
    portalRounds?: number;
  };
  dmDeck: string[];
  dmHand: string[];
  dmDiscard: string[];
  dmCardPlayedThisRound: boolean;
  log: GameLogEntry[];
  diceTray: DiceRoll[];
  floatingText: FloatingText[];
  rollBanner?: RollBanner;
  visitedRoomIds: string[];
  revealedMonsterIds: string[];
  roomNarration?: RoomNarration;
  randomEncounterDeck: string[];
  randomEncounterDiscard: string[];
  activeRandomEncounter?: RandomEncounterReveal;
  pendingAttack?: PendingAttack;
  pendingDiceRoll?: PendingDiceRoll;
  pendingInitiativeRoll?: PendingInitiativeRoll;
  resolved?: PendingRewards;
}

export interface SettingsState {
  debug: boolean;
  reduceMotion: boolean;
}

export interface SavedGameState {
  campaign: CampaignState;
  mapState: MapState | null;
  screen: Screen;
  savedAt: number;
}
