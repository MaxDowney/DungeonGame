import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CardArtwork } from "../Art/DarkFantasyArt";
import { FantasyIcon } from "../../assets/generatedIcons";
import type { DMCard, HeroCard, MonsterAction } from "../../game/types";

const classFrame: Record<string, string> = {
  guardian: "from-sky-500/35 via-slate-900 to-sky-950 border-sky-300/45",
  berserker: "from-red-500/40 via-stone-950 to-red-950 border-red-300/45",
  ranger: "from-emerald-500/35 via-stone-950 to-emerald-950 border-emerald-300/45",
  cleric: "from-amber-300/40 via-stone-950 to-yellow-950 border-amber-200/55",
};

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
        title={disabled ? "Not enough AP or no active hero" : card.text}
        className={`game-card relative flex h-44 min-w-36 max-w-40 flex-col overflow-hidden rounded-lg border bg-gradient-to-br p-3 text-left shadow-card transition ${
          classFrame[card.classId]
        } ${selected ? "ring-2 ring-ember shadow-glow" : ""} ${disabled ? "opacity-45 grayscale" : ""}`}
      >
        <div className="card-cost-gem hero-cost">
          <strong>{card.cost}</strong>
          <span>AP</span>
        </div>
        <div className="absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.22),transparent_65%)]" />
        <div className="relative mb-2 h-16 overflow-hidden rounded-md border border-white/10 bg-black/25">
          <CardArtwork deck={card.classId} icon={card.icon} compact />
        </div>
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-sm font-bold leading-tight text-amber-50">{card.name}</div>
            <div className="mt-1 inline-flex rounded-sm border border-amber-100/20 bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-200">
              {card.type}
            </div>
          </div>
        </div>
        <p className="relative mt-2 line-clamp-4 text-[11px] leading-snug text-stone-200/90">{card.text}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-[10px] uppercase tracking-[0.18em] text-amber-100/80">
          <span>{card.cost} AP</span>
          <span>Lv {card.level}</span>
          <span>R {card.range}</span>
        </div>
      </motion.button>
      {focused && (
        <CardFocus
          title={card.name}
          subtitle={`${card.classId} ${card.type}`}
          icon={card.icon}
          text={card.text}
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
        title={disabled ? "Not enough Doom or play limit reached" : card.text}
        className={`game-card relative flex h-44 min-w-36 max-w-40 flex-col overflow-hidden rounded-lg border border-fuchsia-300/35 bg-gradient-to-br from-fuchsia-800/45 via-stone-950 to-red-950 p-3 text-left shadow-card transition ${
          selected ? "ring-2 ring-fuchsia-300 shadow-[0_0_28px_rgba(217,70,239,.35)]" : ""
        } ${disabled ? "opacity-45 grayscale" : ""}`}
      >
        <div className="card-cost-gem doom-cost">
          <strong>{card.cost}</strong>
          <span>Doom</span>
        </div>
        <div className="relative mb-2 h-16 overflow-hidden rounded-md border border-fuchsia-100/10 bg-black/35">
          <CardArtwork deck="dm" icon={card.icon} compact />
        </div>
        <div className="font-display text-sm font-bold leading-tight text-fuchsia-50">{card.name}</div>
        {card.trigger && <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-red-200">{card.trigger}</div>}
        <p className="relative mt-2 line-clamp-5 text-[11px] leading-snug text-stone-200/90">{card.text}</p>
        <div className="mt-auto pt-2 text-[10px] uppercase tracking-[0.18em] text-fuchsia-100/80">
          {card.cost} Doom
        </div>
      </motion.button>
      {focused && (
        <CardFocus
          title={card.name}
          subtitle="Dungeon card"
          icon={card.icon}
          text={card.text}
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
        title={disabled ? "Not enough AP" : action.text}
        className={`game-card monster-action-card relative flex h-44 min-w-36 max-w-40 flex-col overflow-hidden rounded-lg border border-red-300/35 bg-gradient-to-br from-red-800/45 via-stone-950 to-fuchsia-950 p-3 text-left shadow-card transition ${
          selected ? "ring-2 ring-red-300 shadow-[0_0_28px_rgba(248,113,113,.35)]" : ""
        } ${disabled ? "opacity-45 grayscale" : ""}`}
      >
        <div className="card-cost-gem monster-cost">
          <strong>{action.cost}</strong>
          <span>AP</span>
        </div>
        <div className="relative mb-2 h-16 overflow-hidden rounded-md border border-red-100/10 bg-black/35">
          <CardArtwork deck="monster" icon={action.icon} compact />
        </div>
        <div className="font-display text-sm font-bold leading-tight text-red-50">{action.name}</div>
        <div className="mt-1 inline-flex w-max rounded-sm border border-red-100/20 bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-red-200">
          Monster Action
        </div>
        <p className="relative mt-2 line-clamp-5 text-[11px] leading-snug text-stone-200/90">{action.text}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-[10px] uppercase tracking-[0.18em] text-red-100/80">
          <span>AP {action.cost}</span>
          <span>R {action.range}</span>
        </div>
      </motion.button>
      {focused && (
        <CardFocus
          title={action.name}
          subtitle="Monster action"
          icon={action.icon}
          text={action.text}
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
  icon,
  text,
  deck,
  cost,
  resourceLabel,
  flipped,
  onFlip,
  onClose,
}: {
  title: string;
  subtitle: string;
  icon: string;
  text: string;
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
            <div className="card-focus-cost">
              <strong>{cost}</strong>
              <span>{resourceLabel}</span>
            </div>
            <div className="card-focus-art">
              <CardArtwork deck={deck} icon={icon} />
            </div>
            <div className="eyebrow">{subtitle}</div>
            <h3>{title}</h3>
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
