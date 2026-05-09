import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CardArtwork } from "../Art/DarkFantasyArt";
import { FantasyIcon, fantasyIconTooltip } from "../../assets/generatedIcons";
import type { DMCard, HeroCard, MonsterAction } from "../../game/types";

const classFrame: Record<string, string> = {
  guardian: "from-sky-500/35 via-slate-900 to-sky-950 border-sky-300/45",
  berserker: "from-red-500/40 via-stone-950 to-red-950 border-red-300/45",
  ranger: "from-emerald-500/35 via-stone-950 to-emerald-950 border-emerald-300/45",
  cleric: "from-amber-300/40 via-stone-950 to-yellow-950 border-amber-200/55",
};

const classTooltip: Record<string, string> = {
  guardian: "Guardian / Tank deck: protects allies, manipulates Current Target, and builds Pressure with Hold.",
  berserker: "Berserker / Melee DPS deck: spends AP for heavy adjacent attacks and higher Pull.",
  ranger: "Ranger / Ranged DPS deck: long-range precision attacks with Accuracy and Critical bonuses.",
  cleric: "Cleric / Healer deck: restores HP, revives downed heroes, cleanses, and buffs allies.",
};

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const cardArtUrl = (id: string) => assetUrl(`assets/cards/${id}.png`);
const monsterActionArtId = (actionId: string) => `monster-${actionId}`;

const classIcon: Record<string, string> = {
  guardian: "helm",
  berserker: "axe",
  ranger: "bow",
  cleric: "sun",
};

const cardTypeIcon: Record<string, string> = {
  Attack: "swords",
  Defence: "shield",
  Heal: "heart-plus",
  Buff: "sparkles",
  "Crowd Control": "pin",
  Reaction: "route",
  Utility: "gem",
  Ultimate: "sun",
};

const heroFallbackFlavor: Record<string, string> = {
  guardian: "Iron answers first, and the oath follows.",
  berserker: "The dark waits for one more reckless step.",
  ranger: "A breath, a line, and a promise loosed in silence.",
  cleric: "A thin gold thread holds back the grave.",
};

const heroFlavorById: Record<string, string> = {
  "guardian-taunt": "A raised shield is sometimes louder than a war horn.",
  "guardian-shield-bash": "Steel meets bone with a chapel-bell crack.",
  "guardian-intercept": "The Guardian arrives where the blow was meant to land.",
  "guardian-challenge": "One name, spoken clearly, can chain a monster's fury.",
  "guardian-brace": "Set your feet. Let the dungeon break itself on you.",
  "guardian-shield-wall": "The line holds because someone decides it must.",
  "guardian-immovable-object": "Some doors close. Some heroes simply do not move.",
  "berserker-power-strike": "The axe falls with the weight of every bad decision.",
  "berserker-reckless-strike": "A beautiful mistake, if it lands.",
  "berserker-blood-rush": "Pain becomes pace; pace becomes violence.",
  "berserker-furious-momentum": "Victory is only useful if it carries you forward.",
  "berserker-controlled-strike": "Fury, folded down to a razor edge.",
  "berserker-execute": "The wounded hear the axe before they see it.",
  "berserker-red-ruin": "Two red arcs. One silence afterward.",
  "ranger-aimed-shot": "Even in torch smoke, the Ranger finds the heart of the thing.",
  "ranger-quick-shot": "Fast enough to matter, quiet enough to survive.",
  "ranger-disengage": "Leave only boot dust and a fading curse.",
  "ranger-pinning-shot": "An arrow in the right place turns charge into crawl.",
  "ranger-hunters-mark": "A whisper tied to the target's shadow.",
  "ranger-vanish": "The dungeon blinks, and the Ranger is elsewhere.",
  "ranger-rain-of-arrows": "The ceiling becomes a storm of black feathers.",
  "cleric-heal": "Warmth gathers where the blood should stop.",
  "cleric-sanctuary": "The light does not ask permission to stand between you and death.",
  "cleric-emergency-mend": "A prayer said quickly still reaches the sun.",
  "cleric-divine-intervention": "The grave closes its hand around nothing.",
  "cleric-cleanse": "Corruption burns away like frost on bronze.",
  "cleric-blessing": "A small mercy, sharp enough to win the moment.",
  "cleric-radiant-burst": "The room remembers what dawn felt like.",
};

const monsterActionFlavor: Record<string, string> = {
  move: "Stone scrapes under claw, boot, and dragging chain.",
  "club-strike": "A crude swing with enough force to cave in a shield.",
  "sweeping-blow": "The brute turns the room into a weapon.",
  roar: "The sound reaches the bones before the ears.",
  "smash-forward": "Momentum gathers like a collapsing wall.",
  "shadow-bolt": "A black spark leaps from a prayer said backwards.",
  "dark-mend": "Old wounds knit with stolen heat.",
  hex: "The priest marks a soul with a crooked sign.",
  ritual: "The air thickens as the circle drinks another heartbeat.",
  bite: "Teeth flash low, fast, and hungry.",
  pounce: "The hound is a blur of ember eyes and hooked claws.",
  harry: "It bites, vanishes, and dares you to turn away.",
};

function heroFlavor(card: HeroCard) {
  return card.flavor ?? heroFlavorById[card.id] ?? heroFallbackFlavor[card.classId] ?? "An old tactic, sharpened for desperate rooms.";
}

function monsterFlavor(action: MonsterAction) {
  return action.flavor ?? monsterActionFlavor[action.id] ?? "The dungeon answers with iron, hunger, and spite.";
}

function CardEmblemStrip({
  primaryIcon,
  primaryTooltip,
  secondaryIcon,
  secondaryTooltip,
  tone = "hero",
}: {
  primaryIcon: string;
  primaryTooltip: string;
  secondaryIcon: string;
  secondaryTooltip: string;
  tone?: string;
}) {
  return (
    <div className={`card-emblem-strip ${tone}`}>
      <span className="card-emblem card-emblem-primary" data-tooltip={primaryTooltip} title={primaryTooltip}>
        <FantasyIcon name={primaryIcon} className="h-4 w-4" />
      </span>
      <span className="card-emblem card-emblem-secondary" data-tooltip={secondaryTooltip} title={secondaryTooltip}>
        <FantasyIcon name={secondaryIcon} className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export function HeroGameCard({
  card,
  selected,
  disabled,
  onClick,
  focusOnSelectedClick,
}: {
  card: HeroCard;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  focusOnSelectedClick?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const flavor = heroFlavor(card);
  const heroDeckIcon = classIcon[card.classId] ?? card.icon;
  const typeIcon = cardTypeIcon[card.type] ?? card.icon;
  const cardTooltip = `${card.name}: ${card.type}. Costs ${card.cost} AP, range ${card.range}, level ${card.level}. ${card.text}`;
  const handleClick = () => {
    if (focusOnSelectedClick) {
      if (selected) {
        setFocused(true);
        setFlipped(false);
        return;
      }
      if (disabled) return;
      onClick?.();
      return;
    }
    if (disabled) return;
    onClick?.();
    setFocused(true);
    setFlipped(false);
  };

  return (
    <>
      <motion.button
        type="button"
        whileHover={disabled ? undefined : { y: -14, rotateX: 10, rotateY: 12, rotateZ: -1.5, scale: 1.06 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        style={{ transformPerspective: 950, transformStyle: "preserve-3d" }}
        onClick={handleClick}
        title={disabled ? "Not enough AP or no active hero" : cardTooltip}
        data-tooltip={disabled ? `Cannot play ${card.name}: not enough AP or no active hero.` : cardTooltip}
        className={`game-card relative flex h-48 min-w-40 max-w-44 flex-col overflow-hidden rounded-lg border bg-gradient-to-br p-3 text-left shadow-card transition ${
          classFrame[card.classId]
        } ${selected ? "ring-2 ring-ember shadow-glow" : ""} ${disabled ? "opacity-45 grayscale" : ""}`}
      >
        <div className="card-cost-gem hero-cost" data-tooltip={`AP cost: ${card.cost}. You must spend this many Action Points to play ${card.name}.`}>
          <strong>{card.cost}</strong>
          <span>AP</span>
        </div>
        <CardEmblemStrip
          primaryIcon={heroDeckIcon}
          primaryTooltip={classTooltip[card.classId]}
          secondaryIcon={typeIcon}
          secondaryTooltip={`${card.type}: ${card.text}`}
          tone={card.classId}
        />
        <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.22),transparent_65%)]" />
        <div className="relative mb-2 h-16 overflow-hidden rounded-md border border-white/10 bg-black/25">
          <CardArtwork deck={card.classId} icon={card.icon} assetUrl={cardArtUrl(card.id)} compact />
        </div>
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-sm font-bold leading-tight text-amber-50">{card.name}</div>
            <div className="card-type-pictogram" data-tooltip={`${card.type}: ${card.text}`} title={`${card.type}: ${card.text}`}>
              <FantasyIcon name={typeIcon} className="h-3.5 w-3.5" />
              <span className="sr-only">{card.type}</span>
            </div>
          </div>
        </div>
        <p className="card-flavor">{flavor}</p>
        <p className="relative mt-1.5 line-clamp-3 text-[11px] leading-snug text-stone-200/90">{card.text}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-[10px] uppercase tracking-[0.18em] text-amber-100/80">
          <span data-tooltip={`AP cost: ${card.cost}.`}>{card.cost} AP</span>
          <span data-tooltip={`Level requirement: hero must know this level ${card.level} card.`}>Lv {card.level}</span>
          <span data-tooltip={`Range: can target within ${card.range} square(s), using line of sight if the card requires it.`}>R {card.range}</span>
        </div>
      </motion.button>
      {focused && (
        <CardFocus
          title={card.name}
          subtitle={`${card.classId} ${card.type}`}
          subtitleTooltip={classTooltip[card.classId]}
          icon={card.icon}
          assetUrl={cardArtUrl(card.id)}
          text={card.text}
          flavor={flavor}
          deck={card.classId}
          cost={card.cost}
          resourceLabel="AP"
          flipped={flipped}
          onFlip={() => setFlipped((value) => !value)}
          onClose={() => setFocused(false)}
        />
      )}
    </>
  );
}

export function DMGameCard({
  card,
  selected,
  disabled,
  onClick,
  focusOnSelectedClick,
}: {
  card: DMCard;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  focusOnSelectedClick?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const flavor = "A black-edged tactic drawn from the dungeon's waiting hand.";
  const cardTooltip = `${card.name}: Dungeon card. Costs ${card.cost} Doom. ${card.trigger ? `${card.trigger}. ` : ""}${card.text}`;
  const handleClick = () => {
    if (focusOnSelectedClick) {
      if (selected) {
        setFocused(true);
        setFlipped(false);
        return;
      }
      if (disabled) return;
      onClick?.();
      return;
    }
    if (disabled) return;
    onClick?.();
    setFocused(true);
    setFlipped(false);
  };

  return (
    <>
      <motion.button
        type="button"
        whileHover={disabled ? undefined : { y: -14, rotateX: 10, rotateY: -12, rotateZ: 1.5, scale: 1.06 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        style={{ transformPerspective: 950, transformStyle: "preserve-3d" }}
        onClick={handleClick}
        title={disabled ? "Not enough Doom or play limit reached" : cardTooltip}
        data-tooltip={disabled ? `Cannot play ${card.name}: not enough Doom or the Dungeon card limit is spent.` : cardTooltip}
        className={`game-card relative flex h-44 min-w-36 max-w-40 flex-col overflow-hidden rounded-lg border border-fuchsia-300/35 bg-gradient-to-br from-fuchsia-800/45 via-stone-950 to-red-950 p-3 text-left shadow-card transition ${
          selected ? "ring-2 ring-fuchsia-300 shadow-[0_0_28px_rgba(217,70,239,.35)]" : ""
        } ${disabled ? "opacity-45 grayscale" : ""}`}
      >
        <div className="card-cost-gem doom-cost" data-tooltip={`Doom cost: ${card.cost}. Doom is the Dungeon Master's temporary map resource.`}>
          <strong>{card.cost}</strong>
          <span>Doom</span>
        </div>
        <div className="relative mb-2 h-16 overflow-hidden rounded-md border border-fuchsia-100/10 bg-black/35">
          <CardArtwork deck="dm" icon={card.icon} assetUrl={cardArtUrl(card.id)} compact />
        </div>
        <div className="font-display text-sm font-bold leading-tight text-fuchsia-50">{card.name}</div>
        {card.trigger && <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-red-200" data-tooltip={`Trigger: when this card can be played. ${card.trigger}`}>{card.trigger}</div>}
        <p className="relative mt-2 line-clamp-5 text-[11px] leading-snug text-stone-200/90">{card.text}</p>
        <div className="mt-auto pt-2 text-[10px] uppercase tracking-[0.18em] text-fuchsia-100/80">
          <span data-tooltip={`Doom cost: ${card.cost}.`}>{card.cost} Doom</span>
        </div>
      </motion.button>
      {focused && (
        <CardFocus
          title={card.name}
          subtitle="Dungeon card"
          subtitleTooltip="Dungeon deck: dark tactics, monster tricks, traps, Doom spending, and threat manipulation."
          icon={card.icon}
          assetUrl={cardArtUrl(card.id)}
          text={card.text}
          flavor={flavor}
          deck="dm"
          cost={card.cost}
          resourceLabel="Doom"
          flipped={flipped}
          onFlip={() => setFlipped((value) => !value)}
          onClose={() => setFocused(false)}
        />
      )}
    </>
  );
}

export function MonsterActionCard({
  action,
  selected,
  disabled,
  onClick,
  focusOnSelectedClick,
}: {
  action: MonsterAction;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  focusOnSelectedClick?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const flavor = monsterFlavor(action);
  const actionArtUrl = cardArtUrl(monsterActionArtId(action.id));
  const actionTooltip = `${action.name}: Monster action. Costs ${action.cost} AP, range ${action.range}. ${action.text}`;
  const handleClick = () => {
    if (focusOnSelectedClick) {
      if (selected) {
        setFocused(true);
        setFlipped(false);
        return;
      }
      if (disabled) return;
      onClick?.();
      return;
    }
    if (disabled) return;
    onClick?.();
    setFocused(true);
    setFlipped(false);
  };

  return (
    <>
      <motion.button
        type="button"
        whileHover={disabled ? undefined : { y: -14, rotateX: 10, rotateY: -12, rotateZ: 1.5, scale: 1.06 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        style={{ transformPerspective: 950, transformStyle: "preserve-3d" }}
        onClick={handleClick}
        title={disabled ? "Not enough AP" : actionTooltip}
        data-tooltip={disabled ? `Cannot use ${action.name}: this monster does not have ${action.cost} AP.` : actionTooltip}
        className={`game-card monster-action-card relative flex h-48 min-w-40 max-w-44 flex-col overflow-hidden rounded-lg border border-red-300/35 bg-gradient-to-br from-red-800/45 via-stone-950 to-fuchsia-950 p-3 text-left shadow-card transition ${
          selected ? "ring-2 ring-red-300 shadow-[0_0_28px_rgba(248,113,113,.35)]" : ""
        } ${disabled ? "opacity-45 grayscale" : ""}`}
      >
        <div className="card-cost-gem monster-cost" data-tooltip={`AP cost: ${action.cost}. This monster must spend this many Action Points.`}>
          <strong>{action.cost}</strong>
          <span>AP</span>
        </div>
        <CardEmblemStrip
          primaryIcon="skull"
          primaryTooltip="Monster action deck: printed monster abilities paid with monster AP."
          secondaryIcon={action.icon}
          secondaryTooltip={`${action.name}: ${action.text}`}
          tone="monster"
        />
        <div className="relative mb-2 h-16 overflow-hidden rounded-md border border-red-100/10 bg-black/35">
          <CardArtwork deck="monster" icon={action.icon} assetUrl={actionArtUrl} compact />
        </div>
        <div className="font-display text-sm font-bold leading-tight text-red-50">{action.name}</div>
        <div className="card-type-pictogram monster" data-tooltip="Monster Action: printed monster ability paid with that monster's AP." title="Monster Action: printed monster ability paid with that monster's AP.">
          <FantasyIcon name={action.icon} className="h-3.5 w-3.5" />
          <span className="sr-only">Monster Action</span>
        </div>
        <p className="card-flavor monster">{flavor}</p>
        <p className="relative mt-1.5 line-clamp-3 text-[11px] leading-snug text-stone-200/90">{action.text}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-[10px] uppercase tracking-[0.18em] text-red-100/80">
          <span data-tooltip={`AP cost: ${action.cost}.`}>AP {action.cost}</span>
          <span data-tooltip={`Range: target must be within ${action.range} square(s), if the action targets a unit.`}>R {action.range}</span>
        </div>
      </motion.button>
      {focused && (
        <CardFocus
          title={action.name}
          subtitle="Monster action"
          subtitleTooltip="Monster action: printed ability paid with monster AP."
          icon={action.icon}
          assetUrl={actionArtUrl}
          text={action.text}
          flavor={flavor}
          deck="monster"
          cost={action.cost}
          resourceLabel="AP"
          flipped={flipped}
          onFlip={() => setFlipped((value) => !value)}
          onClose={() => setFocused(false)}
        />
      )}
    </>
  );
}

function CardFocus({
  title,
  subtitle,
  subtitleTooltip,
  icon,
  assetUrl,
  text,
  flavor,
  deck,
  cost,
  resourceLabel,
  flipped,
  onFlip,
  onClose,
}: {
  title: string;
  subtitle: string;
  subtitleTooltip?: string;
  icon: string;
  assetUrl?: string;
  text: string;
  flavor?: string;
  deck: string;
  cost: number;
  resourceLabel: string;
  flipped: boolean;
  onFlip: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const card = (
    <motion.div
      className="card-focus-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="card-focus-scrim" onClick={onClose} title="Close card" />
      <motion.div
        className="card-focus-stage"
        initial={{ scale: 0.65, y: 40, rotateX: -12 }}
        animate={{ scale: 1, y: 0, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <motion.div
          className={`card-focus-card deck-${deck} ${flipped ? "is-flipped" : ""}`}
          animate={{ rotateY: flipped ? 180 : 0, rotateX: flipped ? -3 : 3, rotateZ: flipped ? -0.8 : 0.8 }}
          whileHover={{ rotateX: flipped ? -7 : 7, rotateZ: flipped ? -1.4 : 1.4, scale: 1.015 }}
          transition={{ duration: 0.45 }}
        >
          <div className="card-focus-face card-front">
            <div className="card-focus-cost" data-tooltip={`${resourceLabel} cost: ${cost}.`}>
              <strong>{cost}</strong>
              <span>{resourceLabel}</span>
            </div>
            <div className="card-focus-art">
              <CardArtwork deck={deck} icon={icon} assetUrl={assetUrl} />
            </div>
            <div className="eyebrow" data-tooltip={subtitleTooltip ?? fantasyIconTooltip(deck)}>{subtitle}</div>
            <h3>{title}</h3>
            {flavor && <p className="card-focus-flavor">{flavor}</p>}
            <p>{text}</p>
          </div>
          <div className="card-focus-face card-back">
            <div className="card-back-sigil">
              <FantasyIcon name={deck === "dm" ? "crown" : icon} className="h-24 w-24" />
            </div>
            <h3>{deck === "dm" ? "Dungeon Deck" : "Hero Deck"}</h3>
            <span>{deck}</span>
          </div>
        </motion.div>
        <div className="card-focus-actions">
          <button className="secondary-button" onClick={onFlip}>{flipped ? "Show Front" : "Flip Card"}</button>
          <button className="primary-button compact" onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(card, document.body);
}
