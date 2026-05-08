import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  DoorOpen,
  Gem,
  Heart,
  Hourglass,
  ScrollText,
  Shield,
  Swords,
  Target,
  Zap,
} from "lucide-react";
import { TacticalBoard } from "../Board/TacticalBoard";
import { HeroGameCard, DMGameCard, MonsterActionCard } from "../Cards/GameCard";
import { Dice3D } from "../Effects/Dice3D";
import { APTokens } from "../Tokens/APTokens";
import { heroCardById } from "../../game/data/heroCards";
import { dmCardById } from "../../game/data/dmCards";
import { monsterTemplateById } from "../../game/data/monsters";
import {
  selectActiveUnit,
  selectCurrentMap,
  selectSelectedUnit,
  useGameStore,
} from "../../game/state/store";
import type { Unit } from "../../game/types";

function HealthBar({ unit }: { unit: Unit }) {
  return (
    <div className="meter hp" title="Health">
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
  return (
    <aside className={`panel tactical-panel p-4 ${isActive ? "active-unit-panel" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">{selected.side === "heroes" ? selected.role : selected.family}</div>
          <h3 className="font-display text-2xl font-bold text-amber-100">{selected.name}</h3>
        </div>
        <div className="rounded-md border border-amber-100/20 bg-black/35 px-2 py-1 text-xs uppercase tracking-[0.18em] text-amber-100">
          Lv {selected.level}
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <HealthBar unit={selected} />
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-red-100"><Heart size={14} /> {selected.hp}/{selected.maxHp}</span>
          <APTokens current={selected.ap} max={selected.maxAp} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="stat-chip"><Zap size={14} /> Speed {selected.speed}</span>
          <span className="stat-chip"><Target size={14} /> DT {selected.dt}</span>
          <span className="stat-chip"><Shield size={14} /> Defence {selected.defense + (selected.tempDefense ?? 0)}</span>
          <span className="stat-chip"><Swords size={14} /> Accuracy +{selected.accuracy}</span>
          <span className="stat-chip"><Hourglass size={14} /> Recovery {selected.recovery}</span>
          <span className="stat-chip"><Gem size={14} /> Init +{selected.initiative}</span>
        </div>
        {selected.conditions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.conditions.map((condition) => (
              <span key={condition.type} className="condition-pill" title={`${condition.duration} activation(s)`}>
                {condition.type}
              </span>
            ))}
          </div>
        )}
        {selected.side === "dm" && selected.agro && (
          <div className="agro-panel">
            <div>
              <span>Current Target</span>
              <strong>{target?.name ?? "Nearest visible hero"}</strong>
            </div>
            <div className="pressure-pips" title="Pressure">
              {Array.from({ length: 3 }).map((_, index) => (
                <i key={index} className={index < selected.agro!.pressure ? "lit" : ""} />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function InitiativeBar() {
  const mapState = useGameStore((state) => state.mapState);
  if (!mapState) return null;
  const units = [...mapState.heroes, ...mapState.monsters];
  const map = selectCurrentMap(mapState);

  return (
    <div className="initiative-bar panel">
      <div className="initiative-bar__title">
        <span>Round {mapState.round}</span>
        <strong>Initiative</strong>
      </div>
      <div className="initiative-track">
        {mapState.initiative.order.map((entry, index) => {
          const unit = units.find((candidate) => candidate.id === entry.unitId);
          const played = Boolean(unit?.activated);
          const current = mapState.activeUnitId === entry.unitId;
          const removed = Boolean(unit?.defeated || unit?.downed);
          const tile = unit ? map.tiles.find((candidate) => candidate.x === unit.position.x && candidate.y === unit.position.y) : undefined;
          const revealed = Boolean(unit?.side === "heroes" || tile?.revealed);
          return (
            <div
              key={`${entry.unitId}-${index}`}
              className={`initiative-entry ${entry.side} ${played ? "played" : ""} ${current ? "current" : ""} ${removed ? "removed" : ""} ${!revealed ? "hidden" : ""}`}
              title={revealed ? `${entry.unitName}: d10 ${entry.roll} + initiative ${entry.bonus} = ${entry.total}` : "Unrevealed dungeon threat"}
            >
              <span className="initiative-entry__roll">{entry.total}</span>
              <span className="initiative-entry__name">{revealed ? entry.unitName.split(" ")[0] : "Threat"}</span>
              <small>{removed ? "Out" : !revealed ? "Hidden" : played ? "Played" : current ? "Active" : "Ready"}</small>
            </div>
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
  const endActivation = useGameStore((state) => state.endActivation);

  if (!active || !mapState) {
    return (
      <div className="panel bottom-panel p-4">
        <div className="activation-strip">
          <span>No active figure</span>
          <p className="max-w-md text-sm text-stone-400">
            The round has no ready figures. End activation will advance once a figure is active.
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
            <button className="action-button" onClick={defendActive} disabled={active.ap < 1}>
              <span className="action-button__icon"><Shield size={16} /></span>
              <span className="action-button__copy">
                <strong>Defend</strong>
                <small>Reduce next hit</small>
              </span>
              <span className="action-button__cost">1 AP</span>
            </button>
            <button
              className={`action-button ${mapState.actionMode === "interact" ? "selected" : ""}`}
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
        <div className="resource doom"><span>Doom</span><strong>{mapState.doom}</strong></div>
        <div className="resource dread"><span>Dread</span><strong>{campaign.dread}</strong></div>
        <div className="resource glory"><span>Glory</span><strong>{campaign.glory}</strong></div>
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
              <span>{map.escalation.label}</span>
              <span>{mapState.escalation}/{map.escalation.max}</span>
            </div>
            <div className="meter doom-meter">
              <span style={{ width: `${(mapState.escalation / map.escalation.max) * 100}%` }} />
            </div>
          </div>
        )}
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
        <div className="eyebrow">Dice Tray</div>
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
        <div className="eyebrow">Game Log</div>
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
  const pending = mapState?.pendingAttack;
  const pendingDice = mapState?.pendingDiceRoll;
  const [rolling, setRolling] = useState(false);
  const rollWithBounce = (resolve: () => void) => {
    if (rolling) return;
    setRolling(true);
    window.setTimeout(() => {
      resolve();
      setRolling(false);
    }, 950);
  };
  if (!mapState || (!pending && !pendingDice)) return null;
  const units = [...mapState.heroes, ...mapState.monsters];
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
            <div>{pendingDice.kind === "heal" ? "Healing resolves after the roll." : "Reduction is banked against incoming damage."}</div>
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

export function TacticalScreen() {
  const mapState = useGameStore((state) => state.mapState);
  const setScreen = useGameStore((state) => state.setScreen);
  const map = mapState ? selectCurrentMap(mapState) : undefined;

  if (!mapState || !map) return null;

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
      <InitiativeBar />
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
      <RoomNarrationOverlay />
    </section>
  );
}
