import { motion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Coins,
  DoorOpen,
  Gem,
  Heart,
  Hourglass,
  ScrollText,
  Shield,
  Skull,
  Swords,
  Target,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { TacticalBoard } from "../Board/TacticalBoard";
import { HeroGameCard, DMGameCard, MonsterActionCard } from "../Cards/GameCard";
import { Dice3D } from "../Effects/Dice3D";
import { APTokens } from "../Tokens/APTokens";
import { heroCardById } from "../../game/data/heroCards";
import { dmCardById } from "../../game/data/dmCards";
import { monsterTemplateById } from "../../game/data/monsters";
import { randomEncounterById } from "../../game/data/randomEncounters";
import {
  selectActiveUnit,
  selectCurrentMap,
  selectSelectedUnit,
  useGameStore,
} from "../../game/state/store";
import type { Unit } from "../../game/types";

const tip = {
  hp: "Health: when HP reaches 0, heroes become Downed and monsters are defeated.",
  ap: "AP: Action Points spent on movement, attacks, cards, defence, interactions, and rest.",
  speed: "Speed: squares moved for each Move AP. Slowed/Rooted can reduce this.",
  dt: "DT, Defence Target: attacks hit when d20 + Accuracy + card modifier is at least this number.",
  defense: "Defence: damage reduction after an attack hits. Separate from DT.",
  accuracy: "Accuracy: added to d20 attack rolls before comparing against target DT.",
  recovery: "Recovery: AP regained at round end. Rest recovers Recovery + d3 and ends activation.",
  initiative: "Initiative: each figure rolls d10 + this bonus at the start of the round.",
  pressure: "Pressure: 0-3 pips showing how locked a monster is onto its Current Target.",
  currentTarget: "Current Target: the hero a monster normally must attack unless a rule or DM card overrides it.",
  doom: "Doom: temporary Dungeon Master resource for map tactics and Dungeon cards.",
  dread: "Dread: persistent Dungeon Master campaign resource earned between maps.",
  glory: "Glory: hero campaign score used to track success and progression.",
  escalation: "Escalation: map-specific threat timer advanced each round.",
  diceTray: "Dice Tray: recent rolls and totals.",
  log: "Game Log: rules history for moves, attacks, damage, healing, threat, and objectives.",
};

const unitAssetId = (unit: Unit) =>
  ["guardian", "berserker", "ranger", "cleric", "ogre-brute", "cult-priest", "demon-hound"].includes(unit.templateId)
    ? unit.templateId
    : "dungeon-threat";

const unitMatUrl = (unit: Unit) => `${import.meta.env.BASE_URL}assets/units/mats/${unitAssetId(unit)}.png`;
const unitPortraitUrl = (unit: Unit) => `${import.meta.env.BASE_URL}assets/units/portraits/${unitAssetId(unit)}.png`;

function HealthBar({ unit }: { unit: Unit }) {
  return (
    <div className="meter hp" title={tip.hp} data-tooltip={`${tip.hp} ${unit.name} has ${unit.hp}/${unit.maxHp} HP.`}>
      <span style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }} />
    </div>
  );
}

function UnitPanel() {
  const mapState = useGameStore((state) => state.mapState);
  const selected = selectSelectedUnit(mapState) ?? selectActiveUnit(mapState);
  const isActive = Boolean(selected && mapState?.activeUnitId === selected.id);
  if (!selected) {
    return (
      <aside className="panel tactical-panel p-4">
        <div className="eyebrow">Selected Unit</div>
        <p className="mt-3 text-sm text-stone-400">Select a figure to inspect stats, effects, and threat.</p>
      </aside>
    );
  }
  const target = selected.side === "dm" && selected.agro
    ? mapState?.heroes.find((hero) => hero.id === selected.agro?.currentTargetId)
    : undefined;
  const map = mapState ? selectCurrentMap(mapState) : undefined;
  const targetingMonsters = selected.side === "heroes" && mapState && map
    ? mapState.monsters.filter((monster) => {
        const tile = map.tiles.find((candidate) => candidate.x === monster.position.x && candidate.y === monster.position.y);
        const revealed = tile?.revealed || mapState.revealedMonsterIds?.includes(monster.id);
        return !monster.defeated && revealed && monster.agro?.currentTargetId === selected.id;
      })
    : [];
  const pressureLabel = selected.agro?.pressure === 3 ? "Locked" : selected.agro?.pressure === 2 ? "Firm" : selected.agro?.pressure === 1 ? "Loose" : "Searching";
  return (
    <aside className={`panel tactical-panel p-4 ${isActive ? "active-unit-panel" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">{selected.side === "heroes" ? selected.role : selected.family}</div>
          <h3 className="font-display text-2xl font-bold text-amber-100">{selected.name}</h3>
        </div>
        <div className="rounded-md border border-amber-100/20 bg-black/35 px-2 py-1 text-xs uppercase tracking-[0.18em] text-amber-100" data-tooltip={`Level: campaign power tier for stats and unlocked cards. ${selected.name} is level ${selected.level}.`}>
          Lv {selected.level}
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <HealthBar unit={selected} />
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-red-100" data-tooltip={`${tip.hp} ${selected.name} has ${selected.hp}/${selected.maxHp} HP.`}><Heart size={14} /> {selected.hp}/{selected.maxHp}</span>
          <APTokens current={selected.ap} max={selected.maxAp} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="stat-chip" data-tooltip={tip.speed}><Zap size={14} /> Speed {selected.speed}</span>
          <span className="stat-chip" data-tooltip={tip.dt}><Target size={14} /> DT {selected.dt}</span>
          <span className="stat-chip" data-tooltip={tip.defense}><Shield size={14} /> Defence {selected.defense + (selected.tempDefense ?? 0)}</span>
          <span className="stat-chip" data-tooltip={tip.accuracy}><Swords size={14} /> Accuracy +{selected.accuracy}</span>
          <span className="stat-chip" data-tooltip={tip.recovery}><Hourglass size={14} /> Recovery {selected.recovery}</span>
          <span className="stat-chip" data-tooltip={tip.initiative}><Gem size={14} /> Init +{selected.initiative}</span>
        </div>
        {selected.conditions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.conditions.map((condition) => (
              <span key={condition.type} className="condition-pill" title={`${condition.duration} activation(s)`} data-tooltip={`${condition.type}: condition lasting ${condition.duration} activation(s).`}>
                {condition.type}
              </span>
            ))}
          </div>
        )}
        {selected.side === "dm" && selected.agro && (
          <div className="agro-panel">
            <div data-tooltip={tip.currentTarget}>
              <span>Current Target</span>
              <strong>{target?.name ?? "Nearest visible hero"}</strong>
              <small>{pressureLabel} threat focus</small>
            </div>
            <div className="pressure-pips" title="Pressure" data-tooltip={tip.pressure}>
              {Array.from({ length: 3 }).map((_, index) => (
                <i key={index} className={index < selected.agro!.pressure ? "lit" : ""} />
              ))}
            </div>
          </div>
        )}
        {selected.side === "heroes" && targetingMonsters.length > 0 && (
          <div className="agro-panel hero-threat-panel" data-tooltip="These revealed monsters currently have this hero as their Current Target. Pressure pips show how hard they are locked on.">
            <div>
              <span>Targeted By</span>
              <strong>{targetingMonsters.map((monster) => monster.name).join(", ")}</strong>
              <small>Red tethers on the board show each threat line.</small>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function InitiativeBar({ onInspect }: { onInspect: (unitId: string) => void }) {
  const mapState = useGameStore((state) => state.mapState);
  if (!mapState) return null;
  const units = [...mapState.heroes, ...mapState.monsters];
  const map = selectCurrentMap(mapState);
  const pending = mapState.pendingInitiativeRoll;

  return (
    <div className="initiative-bar panel">
      <div className="initiative-bar__title">
        <span>Round {mapState.round}</span>
        <strong>Initiative</strong>
      </div>
      <div className="initiative-track">
        {pending ? pending.unitIds.map((unitId, index) => {
          const unit = units.find((candidate) => candidate.id === unitId);
          const rolled = pending.rolled.find((entry) => entry.unitId === unitId);
          const current = index === pending.rolled.length;
          if (!unit) return null;
          return (
            <button
              type="button"
              key={`${unitId}-${index}`}
              onClick={() => onInspect(unit.id)}
              className={`initiative-entry pending ${unit.side} ${rolled ? "played" : ""} ${current ? "current" : ""}`}
              title={rolled ? `${rolled.unitName}: d10 ${rolled.roll} + initiative ${rolled.bonus} = ${rolled.total}` : `${unit.name}: waiting for initiative roll`}
              data-tooltip={rolled ? `${rolled.unitName}: initiative total ${rolled.total} from d10 ${rolled.roll} + ${rolled.bonus}.` : `${unit.name}: click Roll Initiative in the dice overlay.`}
            >
              <span className="initiative-entry__roll">{rolled?.total ?? "d10"}</span>
              <span className="initiative-entry__name">{unit.name.split(" ")[0]}</span>
              <small>{rolled ? "Rolled" : current ? "Rolling" : "Waiting"}</small>
            </button>
          );
        }) : mapState.initiative.order.map((entry, index) => {
          const unit = units.find((candidate) => candidate.id === entry.unitId);
          const played = Boolean(unit?.activated);
          const current = mapState.activeUnitId === entry.unitId;
          const removed = Boolean(unit?.defeated || unit?.downed);
          const tile = unit ? map.tiles.find((candidate) => candidate.x === unit.position.x && candidate.y === unit.position.y) : undefined;
          const revealed = Boolean(unit?.side === "heroes" || tile?.revealed || (unit && mapState.revealedMonsterIds?.includes(unit.id)));
          return (
            <button
              type="button"
              key={`${entry.unitId}-${index}`}
              disabled={!unit || !revealed}
              onClick={() => unit && revealed && onInspect(unit.id)}
              className={`initiative-entry ${entry.side} ${played ? "played" : ""} ${current ? "current" : ""} ${removed ? "removed" : ""} ${!revealed ? "hidden" : ""}`}
              title={revealed ? `${entry.unitName}: d10 ${entry.roll} + initiative ${entry.bonus} = ${entry.total}` : "Unrevealed dungeon threat"}
              data-tooltip={revealed ? `${entry.unitName}: initiative total ${entry.total} from d10 ${entry.roll} + ${entry.bonus}. Click to inspect full stats.` : "Unrevealed dungeon threat: hidden until heroes enter its room."}
            >
              <span className="initiative-entry__roll">{entry.total}</span>
              <span className="initiative-entry__name">{revealed ? entry.unitName.split(" ")[0] : "Threat"}</span>
              <small>{removed ? "Out" : !revealed ? "Hidden" : played ? "Played" : current ? "Active" : "Ready"}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BottomPanel() {
  const campaign = useGameStore((state) => state.campaign);
  const mapState = useGameStore((state) => state.mapState);
  const active = selectActiveUnit(mapState);
  const setActionMode = useGameStore((state) => state.setActionMode);
  const selectHeroCard = useGameStore((state) => state.selectHeroCard);
  const selectMonsterAction = useGameStore((state) => state.selectMonsterAction);
  const playSelectedCardOnActive = useGameStore((state) => state.playSelectedCardOnActive);
  const playSelectedMonsterAction = useGameStore((state) => state.playSelectedMonsterAction);
  const defendActive = useGameStore((state) => state.defendActive);
  const restActive = useGameStore((state) => state.restActive);
  const waitActive = useGameStore((state) => state.waitActive);
  const endActivation = useGameStore((state) => state.endActivation);

  if (!active || !mapState) {
    return (
      <div className="panel bottom-panel p-4">
        <div className="activation-strip">
          <span>No active figure</span>
          <p className="max-w-md text-sm text-stone-400">
            Roll initiative in the dice overlay to fix the next activation order.
          </p>
        </div>
      </div>
    );
  }

  const heroProgress = active.side === "heroes" ? campaign?.heroes[active.templateId] : undefined;
  const selectedCard = mapState.selectedCardId ? heroCardById[mapState.selectedCardId] : undefined;
  const monsterActions = active.side === "dm" ? monsterTemplateById[active.templateId]?.actions ?? [] : [];
  const selectedAction = mapState.selectedMonsterActionId
    ? monsterActions.find((action) => action.id === mapState.selectedMonsterActionId)
    : undefined;
  const tacticalMap = selectCurrentMap(mapState);
  const units = [...mapState.heroes, ...mapState.monsters];
  const currentInitiativeIndex = mapState.initiative.order.findIndex((entry) => entry.unitId === active.id);
  const hasLaterReadyFigure = mapState.initiative.order.slice(currentInitiativeIndex + 1).some((entry) => {
    const unit = units.find((candidate) => candidate.id === entry.unitId);
    const tile = unit ? tacticalMap.tiles.find((candidate) => candidate.x === unit.position.x && candidate.y === unit.position.y) : undefined;
    const revealed = Boolean(unit?.side === "heroes" || tile?.revealed || (unit && mapState.revealedMonsterIds?.includes(unit.id)));
    return Boolean(unit && revealed && !unit.activated && !unit.defeated && !unit.downed);
  });
  const waitDisabled = Boolean(mapState.pendingAttack || mapState.pendingDiceRoll || mapState.pendingInitiativeRoll || !hasLaterReadyFigure);
  const waitTooltip = hasLaterReadyFigure
    ? "Wait: costs 0 AP. Keep all current AP, move this figure to the end of the current initiative order, and pass to the next ready figure."
    : "Wait: unavailable because there is no later ready figure to pass to.";
  const restDisabled = Boolean(mapState.actionTakenThisActivation || mapState.pendingAttack || mapState.pendingDiceRoll);
  const restTooltip = mapState.actionTakenThisActivation
    ? `Rest: unavailable because ${active.name} has already taken an action this activation.`
    : `Rest: only available before taking any other action. Skip the rest of ${active.name}'s activation, roll d3, recover Recovery ${active.recovery} + d3 AP up to max.`;

  return (
    <div className="panel bottom-panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Active Figure</div>
          <div className="font-display text-xl font-bold text-amber-100">{active.name}</div>
        </div>
        <APTokens current={active.ap} max={active.maxAp} />
        <button className="primary-button compact" onClick={endActivation}>
          End Activation
          <ArrowRight size={16} />
        </button>
      </div>

      {active.side === "heroes" ? (
        <div className="grid gap-3 lg:grid-cols-[auto_1fr]">
          <div className="universal-actions">
            <button
              className={`action-button ${mapState.actionMode === "move" ? "selected" : ""}`}
              data-tooltip={`Move: spend AP to move up to Speed squares per AP. ${active.name} has Speed ${active.speed}.`}
              onClick={() => setActionMode("move")}
              disabled={active.ap < 1}
            >
              <span className="action-button__icon"><Zap size={16} /></span>
              <span className="action-button__copy">
                <strong>Move</strong>
                <small>Up to Speed per AP</small>
              </span>
              <span className="action-button__cost">1+ AP</span>
            </button>
            <button
              className={`action-button ${mapState.actionMode === "attack" ? "selected" : ""}`}
              data-tooltip={`Basic Attack: costs 2 AP, rolls d20 + Accuracy vs DT, then weapon damage on hit. Weapon: ${active.weapon?.name ?? "none"}.`}
              onClick={() => setActionMode("attack")}
              disabled={active.ap < 2}
            >
              <span className="action-button__icon"><Swords size={16} /></span>
              <span className="action-button__copy">
                <strong>Attack</strong>
                <small>{active.weapon?.name ?? "Weapon"} R{active.weapon?.range ?? 1}</small>
              </span>
              <span className="action-button__cost">2 AP</span>
            </button>
            <button className="action-button" onClick={defendActive} disabled={active.ap < 1} data-tooltip="Defend: costs 1 AP. Adds Defence as damage reduction against the next incoming hit. If holding an adjacent monster's Current Target, adds Hold 1.">
              <span className="action-button__icon"><Shield size={16} /></span>
              <span className="action-button__copy">
                <strong>Defend</strong>
                <small>Reduce next hit</small>
              </span>
              <span className="action-button__cost">1 AP</span>
            </button>
            <button
              className={`action-button ${mapState.actionMode === "interact" ? "selected" : ""}`}
              data-tooltip="Interact: costs 1 AP. Open adjacent doors, claim relics, activate exits, or seal anchors."
              onClick={() => setActionMode("interact")}
              disabled={active.ap < 1}
            >
              <span className="action-button__icon"><DoorOpen size={16} /></span>
              <span className="action-button__copy">
                <strong>Interact</strong>
                <small>Doors and objectives</small>
              </span>
              <span className="action-button__cost">1 AP</span>
            </button>
            <button
              className={`action-button rest-action ${restDisabled ? "is-disabled" : ""}`}
              onClick={() => {
                if (!restDisabled) restActive();
              }}
              aria-disabled={restDisabled}
              data-tooltip={restTooltip}
            >
              <span className="action-button__icon"><Hourglass size={16} /></span>
              <span className="action-button__copy">
                <strong>Rest</strong>
                <small>Skip turn, recover</small>
              </span>
              <span className="action-button__cost">Recovery + d3</span>
            </button>
            <button
              className={`action-button wait-action ${waitDisabled ? "is-disabled" : ""}`}
              onClick={() => {
                if (!waitDisabled) waitActive();
              }}
              aria-disabled={waitDisabled}
              data-tooltip={waitTooltip}
            >
              <span className="action-button__icon"><ArrowRight size={16} /></span>
              <span className="action-button__copy">
                <strong>Wait</strong>
                <small>Delay initiative</small>
              </span>
              <span className="action-button__cost">0 AP</span>
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {heroProgress?.handCardIds.map((cardId) => {
              const card = heroCardById[cardId];
              return (
                <HeroGameCard
                  key={cardId}
                  card={card}
                  selected={mapState.selectedCardId === cardId}
                  disabled={active.ap < card.cost}
                  onClick={() => selectHeroCard(cardId)}
                  focusOnSelectedClick
                />
              );
            })}
            {selectedCard && ["self", "none"].includes(selectedCard.target) && !selectedCard.effects.some((effect) => effect.kind === "move") && (
              <button className="primary-button self-cast" onClick={playSelectedCardOnActive}>
                Play {selectedCard.name}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="universal-actions monster-rest-actions">
            <button
              className={`action-button wait-action ${waitDisabled ? "is-disabled" : ""}`}
              onClick={() => {
                if (!waitDisabled) waitActive();
              }}
              aria-disabled={waitDisabled}
              data-tooltip={waitTooltip}
            >
              <span className="action-button__icon"><ArrowRight size={16} /></span>
              <span className="action-button__copy">
                <strong>Wait</strong>
                <small>Delay initiative</small>
              </span>
              <span className="action-button__cost">0 AP</span>
            </button>
            <button
              className={`action-button rest-action ${restDisabled ? "is-disabled" : ""}`}
              onClick={() => {
                if (!restDisabled) restActive();
              }}
              aria-disabled={restDisabled}
              data-tooltip={restTooltip}
            >
              <span className="action-button__icon"><Hourglass size={16} /></span>
              <span className="action-button__copy">
                <strong>Rest</strong>
                <small>Skip turn, recover</small>
              </span>
              <span className="action-button__cost">Recovery + d3</span>
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {monsterActions.map((action) => (
              <MonsterActionCard
                key={action.id}
                action={action}
                selected={mapState.selectedMonsterActionId === action.id}
                disabled={active.ap < action.cost}
                onClick={() => selectMonsterAction(action.id)}
                focusOnSelectedClick
              />
            ))}
          </div>
          <div className="rounded-md border border-fuchsia-300/15 bg-black/25 p-3 text-sm text-stone-300">
            {selectedAction ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display text-lg text-fuchsia-100">{selectedAction.name}</div>
                  <p className="mt-1">{selectedAction.text}</p>
                </div>
                {["self", "none", "allAdjacentEnemies"].includes(selectedAction.target) && (
                  <button className="secondary-button" onClick={playSelectedMonsterAction}>
                    Resolve Action
                  </button>
                )}
              </div>
            ) : (
              "Choose a monster action card, then click its target or destination on the board."
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RightPanel() {
  const campaign = useGameStore((state) => state.campaign);
  const mapState = useGameStore((state) => state.mapState);
  const selectDmCard = useGameStore((state) => state.selectDmCard);
  const playSelectedDmCard = useGameStore((state) => state.playSelectedDmCard);
  const resolveCurrentMap = useGameStore((state) => state.resolveCurrentMap);
  if (!mapState || !campaign) return null;
  const map = selectCurrentMap(mapState);
  const selectedDmCard = mapState.selectedDmCardId ? dmCardById[mapState.selectedDmCardId] : undefined;

  return (
    <aside className="panel tactical-panel right-panel p-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="resource doom" data-tooltip={tip.doom}><span>Doom</span><strong>{mapState.doom}</strong></div>
        <div className="resource dread" data-tooltip={tip.dread}><span>Dread</span><strong>{campaign.dread}</strong></div>
        <div className="resource glory" data-tooltip={tip.glory}><span>Glory</span><strong>{campaign.glory}</strong></div>
      </div>
      <div className="mt-4 rounded-md border border-amber-100/15 bg-black/25 p-3">
        <div className="flex items-center justify-between text-sm">
          <span>Round {mapState.round}</span>
          <span>{mapState.activeUnitId ? `Active: ${[...mapState.heroes, ...mapState.monsters].find((unit) => unit.id === mapState.activeUnitId)?.name}` : "No active figure"}</span>
        </div>
        <div className="mt-2 text-xs text-stone-300">
          Each figure rolled d10 + Initiative. The order is fixed until the round ends.
        </div>
        {map.escalation && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-stone-300">
              <span data-tooltip={tip.escalation}>{map.escalation.label}</span>
              <span>{mapState.escalation}/{map.escalation.max}</span>
            </div>
            <div className="meter doom-meter">
              <span style={{ width: `${(mapState.escalation / map.escalation.max) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
      <div
        className="encounter-watch"
        data-tooltip="Random Encounter: checked only at round end, before initiative is rolled again. Draw if no revealed monsters remain and no monster was defeated during that round."
      >
        <span>Encounter Deck</span>
        <strong>{mapState.randomEncounterDeck.length}</strong>
        <small>{mapState.randomEncounterDiscard.length} seen</small>
      </div>
      <div className="mt-4">
        <div className="eyebrow">Dungeon Hand</div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-3">
          {mapState.dmHand.map((cardId) => {
            const card = dmCardById[cardId];
            return (
              <DMGameCard
                key={cardId}
                card={card}
                selected={mapState.selectedDmCardId === cardId}
                disabled={mapState.doom < card.cost || (mapState.dmCardPlayedThisRound && card.id !== "blood-price")}
                onClick={() => selectDmCard(cardId)}
                focusOnSelectedClick
              />
            );
          })}
          {selectedDmCard?.target === "none" && (
            <button className="secondary-button self-cast" onClick={playSelectedDmCard}>
              Play {selectedDmCard.name}
            </button>
          )}
        </div>
      </div>
      <div className="mt-1 flex gap-2">
        <button className="secondary-button flex-1" onClick={resolveCurrentMap}>
          Resolve Map
        </button>
      </div>
      <div className="mt-4">
        <div className="eyebrow" data-tooltip={tip.diceTray}>Dice Tray</div>
        <div className="dice-tray">
          {mapState.diceTray.map((roll) => (
            <motion.div key={roll.id} className="die-roll" initial={{ rotate: -6, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }}>
              <span>{roll.label}</span>
              <strong>{roll.total}</strong>
              <small>{roll.dice.map((die) => `d${die.sides}:${die.result}`).join(" ")}</small>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="mt-4 min-h-0">
        <div className="eyebrow" data-tooltip={tip.log}>Game Log</div>
        <div className="game-log">
          {mapState.log.map((entry) => (
            <div key={entry.id} className={`log-entry ${entry.tone}`}>
              <span>R{entry.round}</span>
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ManualDiceOverlay() {
  const mapState = useGameStore((state) => state.mapState);
  const rollPendingHit = useGameStore((state) => state.rollPendingHit);
  const rollPendingDamage = useGameStore((state) => state.rollPendingDamage);
  const rollPendingUtilityDice = useGameStore((state) => state.rollPendingUtilityDice);
  const rollPendingInitiative = useGameStore((state) => state.rollPendingInitiative);
  const pending = mapState?.pendingAttack;
  const pendingDice = mapState?.pendingDiceRoll;
  const pendingInitiative = mapState?.pendingInitiativeRoll;
  const [rolling, setRolling] = useState(false);
  const rollWithBounce = (resolve: () => void) => {
    if (rolling) return;
    setRolling(true);
    window.setTimeout(() => {
      resolve();
      setRolling(false);
    }, 950);
  };
  if (!mapState || (!pending && !pendingDice && !pendingInitiative)) return null;
  const units = [...mapState.heroes, ...mapState.monsters];
  if (pendingInitiative) {
    const currentUnitId = pendingInitiative.unitIds[pendingInitiative.rolled.length];
    const currentUnit = units.find((unit) => unit.id === currentUnitId);
    const rolledCount = pendingInitiative.rolled.length;
    const totalCount = pendingInitiative.unitIds.length;
    return (
      <motion.div
        className="manual-dice-overlay"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
      >
        <div className="manual-dice-panel initiative-dice-panel">
          <div>
            <div className="eyebrow">Round {pendingInitiative.round} Initiative</div>
            <h3 className="font-display text-2xl font-bold text-amber-100">
              {currentUnit ? `${currentUnit.name} rolls initiative` : "Initiative Complete"}
            </h3>
            <p className="mt-1 text-sm text-stone-300">
              Roll d10 + Initiative for every revealed figure. The order stays fixed for the round.
            </p>
          </div>
          <Dice3D dice={["d10"]} value={rolling ? "..." : "d10"} rolling={rolling} />
          <div className="manual-dice-details">
            <div>
              {currentUnit ? `d10 + Initiative ${currentUnit.initiative >= 0 ? "+" : ""}${currentUnit.initiative}` : "All revealed figures have rolled."}
            </div>
            <div>
              {rolledCount}/{totalCount} initiative rolls complete.
            </div>
            {pendingInitiative.rolled.length > 0 && (
              <div className="initiative-roll-summary">
                {pendingInitiative.rolled.map((entry) => `${entry.unitName} ${entry.total}`).join(" · ")}
              </div>
            )}
            <button className="primary-button compact" onClick={() => rollWithBounce(rollPendingInitiative)} disabled={rolling || !currentUnit}>
              {rolling ? "Rolling..." : currentUnit ? "Roll Initiative" : "Set Order"}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
  if (pendingDice) {
    const targets = pendingDice.targetIds
      .map((id) => units.find((unit) => unit.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    return (
      <motion.div
        className="manual-dice-overlay"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
      >
        <div className="manual-dice-panel">
          <div>
            <div className="eyebrow">Manual Dice</div>
            <h3 className="font-display text-2xl font-bold text-amber-100">{pendingDice.label}</h3>
            <p className="mt-1 text-sm text-stone-300">{targets}</p>
          </div>
          <Dice3D dice={pendingDice.dice.length ? pendingDice.dice : ["d6"]} value={rolling ? "..." : pendingDice.dice.join(" + ") || "d6"} rolling={rolling} />
          <div className="manual-dice-details">
            <div>
              Roll {pendingDice.dice.join(" + ")}
              {pendingDice.flat ? ` + ${pendingDice.flat}` : ""}
            </div>
            <div>
              {pendingDice.kind === "heal"
                ? "Healing resolves after the roll."
                : pendingDice.kind === "rest"
                  ? "Rest recovers AP, then the activation ends."
                  : "Reduction is banked against incoming damage."}
            </div>
            <button className="primary-button compact" onClick={() => rollWithBounce(rollPendingUtilityDice)} disabled={rolling}>
              {rolling ? "Rolling..." : "Roll Dice"}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
  if (!pending) return null;
  const attacker = units.find((unit) => unit.id === pending.attackerId);
  const target = units.find((unit) => unit.id === pending.targetId);
  if (!attacker || !target) return null;
  const hitRoll = pending.hitRoll;
  const progressLabel =
    pending.totalTargets && pending.totalTargets > 1
      ? `Target ${(pending.targetIndex ?? 0) + 1} of ${pending.totalTargets}`
      : "";

  return (
    <motion.div
      className="manual-dice-overlay"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
    >
      <div className={`manual-dice-panel ${hitRoll?.critical ? "critical" : ""}`}>
        <div>
          <div className="eyebrow">Manual Dice</div>
          <h3 className="font-display text-2xl font-bold text-amber-100">{pending.sourceName}</h3>
          <p className="mt-1 text-sm text-stone-300">
            {attacker.name} attacking {target.name}
            {progressLabel ? ` - ${progressLabel}` : ""}
          </p>
        </div>
        <Dice3D
          dice={pending.stage === "hit" ? ["d20"] : pending.damageDice}
          value={rolling ? "..." : pending.stage === "hit" ? hitRoll?.natural ?? "d20" : pending.damageDice.join(" + ")}
          critical={hitRoll?.critical}
          danger={hitRoll?.fumble}
          rolling={rolling}
        />
        <div className="manual-dice-details">
          {pending.stage === "hit" ? (
            <>
              <div>
                d20 + Accuracy {attacker.accuracy} + Card {pending.attack.accuracyModifier} vs DT {target.dt}
              </div>
              <div>
                Critical +{pending.attack.criticalBonus} / Fumble +{pending.attack.fumbleBonus}
              </div>
              {progressLabel && <div>Multi-target attacks resolve one target at a time.</div>}
              <button className="primary-button compact" onClick={() => rollWithBounce(rollPendingHit)} disabled={rolling}>
                {rolling ? "Rolling..." : "Roll d20"}
              </button>
            </>
          ) : (
            <>
              <div>
                {hitRoll?.outcome}: {hitRoll?.natural} + {hitRoll?.accuracy} + {hitRoll?.cardModifier} ={" "}
                {hitRoll?.total} vs DT {hitRoll?.targetDT}
              </div>
              <div>
                Damage {pending.damageDice.join(" + ")}
                {pending.flatDamage ? ` + ${pending.flatDamage}` : ""}
                {hitRoll?.critical ? " x2" : ""}
              </div>
              <button className="primary-button compact" onClick={() => rollWithBounce(rollPendingDamage)} disabled={rolling}>
                {rolling ? "Rolling..." : "Roll Damage"}
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DebugPanel() {
  const debug = useGameStore((state) => state.settings.debug);
  const addDoom = useGameStore((state) => state.debugAddDoom);
  const damage = useGameStore((state) => state.debugDamageSelected);
  const heal = useGameStore((state) => state.debugHealSelected);
  const complete = useGameStore((state) => state.debugCompleteObjective);
  const resetAp = useGameStore((state) => state.debugResetAp);
  if (!debug) return null;
  return (
    <div className="debug-panel">
      <button onClick={addDoom}>+3 Doom</button>
      <button onClick={() => damage(5)}>5 Damage</button>
      <button onClick={() => heal(5)}>5 Heal</button>
      <button onClick={resetAp}>Reset AP</button>
      <button onClick={complete}>Complete Objective</button>
    </div>
  );
}

function ResultBurst() {
  const banner = useGameStore((state) => state.mapState?.rollBanner);
  if (!banner) return null;
  return (
    <motion.div
      key={banner.id}
      className={`result-burst ${banner.tone}`}
      initial={{ opacity: 0, scale: 0.55, y: 30 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.55, 1.18, 1, 1.08], y: [30, 0, 0, -18] }}
      transition={{ duration: 2.2, ease: "easeOut" }}
    >
      <div className="result-burst__flare" />
      <strong>{banner.text}</strong>
      <span>{banner.detail}</span>
    </motion.div>
  );
}

function RoomNarrationOverlay() {
  const narration = useGameStore((state) => state.mapState?.roomNarration);
  const dismissRoomNarration = useGameStore((state) => state.dismissRoomNarration);
  if (!narration) return null;

  return (
    <motion.div
      key={narration.id}
      className="room-narration-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="room-narration-scrim" />
      <motion.article
        className="room-narration-card"
        initial={{ y: 28, scale: 0.92, rotateX: -8 }}
        animate={{ y: 0, scale: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="room-narration-seal">
          <ScrollText size={34} />
        </div>
        <div className="eyebrow">New Room</div>
        <h3>{narration.name}</h3>
        <p>{narration.text}</p>
        <button className="primary-button compact" onClick={dismissRoomNarration}>
          Enter Room
        </button>
      </motion.article>
    </motion.div>
  );
}

function RandomEncounterOverlay() {
  const reveal = useGameStore((state) => state.mapState?.activeRandomEncounter);
  const dismissRandomEncounter = useGameStore((state) => state.dismissRandomEncounter);
  if (!reveal) return null;
  const card = randomEncounterById[reveal.cardId];
  if (!card) return null;
  const Icon = card.kind === "monster" ? Skull : card.kind === "treasure" ? Coins : UserRound;
  const typeLabel =
    card.kind === "monster"
      ? "Monster Encounter"
      : card.kind === "treasure"
        ? "Treasure Encounter"
        : card.disposition === "bad"
          ? "Dangerous NPC"
          : "Helpful NPC";

  return (
    <motion.div
      key={reveal.id}
      className="random-encounter-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="random-encounter-scrim" onClick={dismissRandomEncounter} title="Close encounter" />
      <motion.article
        className={`random-encounter-card ${card.kind} ${card.disposition ?? ""}`}
        initial={{ y: 34, scale: 0.88, rotateY: -12, rotateX: 8 }}
        animate={{ y: 0, scale: 1, rotateY: 0, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        <button className="random-encounter-close" onClick={dismissRandomEncounter} data-tooltip="Close encounter card">
          <X size={18} />
        </button>
        <div className="random-encounter-frame">
          <div className="random-encounter-art">
            <div className="random-encounter-moon" />
            <Icon size={68} />
          </div>
          <div className="random-encounter-meta">
            <span>{typeLabel}</span>
            <i>{card.rarity}</i>
          </div>
          <h3>{card.name}</h3>
          <p>{card.text}</p>
          <div className="random-encounter-effect">
            <ScrollText size={18} />
            <span>{reveal.effectSummary}</span>
          </div>
          <button className="primary-button compact" onClick={dismissRandomEncounter}>
            Continue
          </button>
        </div>
      </motion.article>
    </motion.div>
  );
}

function UnitInspectOverlay({
  unit,
  onClose,
}: {
  unit: Unit | undefined;
  onClose: () => void;
}) {
  const mapState = useGameStore((state) => state.mapState);
  if (!unit || !mapState) return null;
  const target = unit.side === "dm" && unit.agro?.currentTargetId
    ? mapState.heroes.find((hero) => hero.id === unit.agro?.currentTargetId)
    : undefined;
  const monsterActions = unit.side === "dm" ? monsterTemplateById[unit.templateId]?.actions ?? [] : [];
  const matStyle = {
    "--unit-color": unit.color,
    "--unit-mat": `url("${unitMatUrl(unit)}")`,
  } as CSSProperties;

  return (
    <motion.div
      className="unit-inspect-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="unit-inspect-scrim" onClick={onClose} title="Close unit card" />
      <motion.article
        className={`unit-inspect-card ${unit.side}`}
        style={matStyle}
        initial={{ y: 28, scale: 0.92, rotateX: -8 }}
        animate={{ y: 0, scale: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="unit-inspect-portrait">
          <img src={unitPortraitUrl(unit)} alt="" />
        </div>
        <div className="unit-inspect-heading">
          <div>
            <div className="eyebrow">{unit.side === "heroes" ? unit.role : unit.family}</div>
            <h3>{unit.name}</h3>
          </div>
          <button className="secondary-button compact" onClick={onClose}>Close</button>
        </div>
        <HealthBar unit={unit} />
        <div className="unit-inspect-vitals">
          <span data-tooltip={tip.hp}><Heart size={15} /> {unit.hp}/{unit.maxHp} HP</span>
          <span data-tooltip={tip.ap}><Zap size={15} /> {unit.ap}/{unit.maxAp} AP</span>
          <span data-tooltip="Level: campaign power tier for stats and unlocked cards."><Gem size={15} /> Level {unit.level}</span>
        </div>
        <div className="unit-inspect-stats">
          <span data-tooltip={tip.recovery}>Recovery <strong>{unit.recovery}</strong></span>
          <span data-tooltip={tip.speed}>Speed <strong>{unit.speed}</strong></span>
          <span data-tooltip={tip.dt}>DT <strong>{unit.dt}</strong></span>
          <span data-tooltip={tip.defense}>Defence <strong>{unit.defense + (unit.tempDefense ?? 0)}</strong></span>
          <span data-tooltip={tip.initiative}>Initiative <strong>{unit.initiative >= 0 ? `+${unit.initiative}` : unit.initiative}</strong></span>
          <span data-tooltip={tip.accuracy}>Accuracy <strong>{unit.accuracy >= 0 ? `+${unit.accuracy}` : unit.accuracy}</strong></span>
          <span data-tooltip="Power: added to healing and some class effects.">Power <strong>{unit.power}</strong></span>
          <span data-tooltip="Position: current board coordinates, shown as column,row.">Position <strong>{unit.position.x + 1},{unit.position.y + 1}</strong></span>
        </div>
        {unit.weapon && (
          <div className="unit-inspect-section" data-tooltip="Weapon: die and range used by Basic Attack and weapon-based class cards.">
            <strong>Weapon</strong>
            <span>{unit.weapon.name}: {unit.weapon.die}, Range {unit.weapon.range}</span>
          </div>
        )}
        {unit.conditions.length > 0 && (
          <div className="unit-inspect-tags">
            {unit.conditions.map((condition) => (
              <span key={condition.type} data-tooltip={`${condition.type}: condition lasting ${condition.duration} activation(s).`}>{condition.type} {condition.duration}</span>
            ))}
          </div>
        )}
        {unit.side === "dm" && unit.agro && (
          <div className="unit-inspect-section" data-tooltip={`${tip.currentTarget} ${tip.pressure}`}>
            <strong>Threat</strong>
            <span>Current Target: {target?.name ?? "Nearest visible hero"}</span>
            <div className="pressure-pips" title="Pressure">
              {Array.from({ length: 3 }).map((_, index) => (
                <i key={index} className={index < unit.agro!.pressure ? "lit" : ""} />
              ))}
            </div>
          </div>
        )}
        {monsterActions.length > 0 && (
          <div className="unit-inspect-actions">
            {monsterActions.map((action) => (
              <div key={action.id} data-tooltip={`${action.name}: costs ${action.cost} AP, range ${action.range}. ${action.text}`}>
                <strong>{action.name}</strong>
                <span>{action.cost} AP, R{action.range}</span>
                <p>{action.text}</p>
              </div>
            ))}
          </div>
        )}
      </motion.article>
    </motion.div>
  );
}

function TurnSplashOverlay() {
  const mapState = useGameStore((state) => state.mapState);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const active = mapState ? selectActiveUnit(mapState) : undefined;
  const currentKey = active ? `${mapState?.round}-${active.id}` : null;

  useEffect(() => {
    if (!currentKey) return;
    setVisibleKey(currentKey);
    const timer = window.setTimeout(() => setVisibleKey(null), 1650);
    return () => window.clearTimeout(timer);
  }, [currentKey]);

  if (!mapState || !active || visibleKey !== currentKey) return null;

  const currentIndex = mapState.initiative.currentIndex + 1;
  const total = mapState.initiative.order.length;
  const sideLabel = active.side === "heroes" ? "Hero Turn" : "Dungeon Turn";

  return (
    <motion.div
      key={currentKey}
      className={`turn-splash-overlay ${active.side}`}
      initial={{ opacity: 0, scale: 0.9, y: 22 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1.04, 1, 1.02], y: [22, 0, 0, -18] }}
      transition={{ duration: 1.55, ease: "easeOut" }}
    >
      <div className="turn-splash-flare" />
      <div className="turn-splash-kicker">
        <span>{sideLabel}</span>
        <i>Order {currentIndex}/{total}</i>
      </div>
      <strong>{active.name}</strong>
      <small>{active.ap}/{active.maxAp} AP ready</small>
    </motion.div>
  );
}

export function TacticalScreen() {
  const mapState = useGameStore((state) => state.mapState);
  const setScreen = useGameStore((state) => state.setScreen);
  const [inspectedUnitId, setInspectedUnitId] = useState<string | null>(null);
  const map = mapState ? selectCurrentMap(mapState) : undefined;

  if (!mapState || !map) return null;
  const inspectedUnit = inspectedUnitId
    ? [...mapState.heroes, ...mapState.monsters].find((unit) => unit.id === inspectedUnitId)
    : undefined;

  return (
    <section className="tactical-shell h-full p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Tactical Map</div>
          <h2 className="font-display text-3xl font-black text-amber-100">{map.name}</h2>
        </div>
        <button className="secondary-button" onClick={() => setScreen("campaign")}>
          Campaign
        </button>
      </div>
      <InitiativeBar onInspect={setInspectedUnitId} />
      <div className="relative mt-3 grid h-[calc(100%-10rem)] gap-4 xl:grid-cols-[19rem_1fr_22rem]">
        <UnitPanel />
        <div className="relative grid min-h-0 grid-rows-[1fr_auto] gap-4">
          <div className="panel grid min-h-0 place-items-center p-4">
            <TacticalBoard />
          </div>
          <BottomPanel />
        </div>
        <RightPanel />
      </div>
      <DebugPanel />
      <ManualDiceOverlay />
      <ResultBurst />
      <TurnSplashOverlay />
      <UnitInspectOverlay unit={inspectedUnit} onClose={() => setInspectedUnitId(null)} />
      <RoomNarrationOverlay />
      <RandomEncounterOverlay />
    </section>
  );
}
