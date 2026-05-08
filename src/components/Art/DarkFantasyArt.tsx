import { FantasyIcon, fantasyIconTooltip } from "../../assets/generatedIcons";
import type { CSSProperties } from "react";

const palette: Record<string, { a: string; b: string; c: string; glow: string }> = {
  guardian: { a: "#1d4f7a", b: "#0b1724", c: "#8dd3ff", glow: "#38bdf8" },
  berserker: { a: "#7f1d1d", b: "#140708", c: "#ff9b72", glow: "#ef4444" },
  ranger: { a: "#14532d", b: "#07140d", c: "#a7f3d0", glow: "#22c55e" },
  cleric: { a: "#854d0e", b: "#171008", c: "#fde68a", glow: "#facc15" },
  dm: { a: "#581c87", b: "#120617", c: "#f0abfc", glow: "#d946ef" },
  monster: { a: "#7f1d1d", b: "#13070d", c: "#fecaca", glow: "#fb7185" },
};

const iconForDeck = (deck: string, icon: string) => (deck === "dm" ? "crown" : icon);

export function CardArtwork({
  deck,
  icon,
  compact = false,
}: {
  deck: string;
  icon: string;
  compact?: boolean;
}) {
  const colors = palette[deck] ?? palette.dm;
  const artIcon = iconForDeck(deck, icon);
  const tooltip = fantasyIconTooltip(artIcon);
  return (
    <div
      className={`dark-art ${compact ? "compact" : ""}`}
      style={{ "--art-a": colors.a, "--art-b": colors.b, "--art-c": colors.c, "--art-glow": colors.glow } as CSSProperties}
      data-tooltip={tooltip}
      title={tooltip}
    >
      <svg viewBox="0 0 320 220" role="img" aria-label={`${deck} fantasy card art`}>
        <defs>
          <radialGradient id={`moon-${deck}-${icon}`} cx="50%" cy="25%" r="55%">
            <stop offset="0%" stopColor={colors.c} stopOpacity="0.72" />
            <stop offset="42%" stopColor={colors.glow} stopOpacity="0.22" />
            <stop offset="100%" stopColor={colors.b} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`steel-${deck}-${icon}`} x1="0%" x2="100%">
            <stop offset="0%" stopColor={colors.b} />
            <stop offset="50%" stopColor={colors.a} />
            <stop offset="100%" stopColor={colors.b} />
          </linearGradient>
          <filter id={`rough-${deck}-${icon}`}>
            <feTurbulence baseFrequency="0.018 0.09" numOctaves="3" seed="7" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.18" />
            </feComponentTransfer>
          </filter>
        </defs>
        <rect width="320" height="220" rx="18" fill={colors.b} />
        <rect width="320" height="220" rx="18" fill={`url(#moon-${deck}-${icon})`} />
        <path d="M0 174 L42 135 L82 164 L122 104 L166 158 L204 116 L248 164 L320 110 L320 220 L0 220 Z" fill={`url(#steel-${deck}-${icon})`} opacity="0.92" />
        <path d="M0 182 C56 160 88 194 142 176 C206 154 250 190 320 150 L320 220 L0 220 Z" fill="#050507" opacity="0.88" />
        <path d="M42 44 C68 24 96 25 117 47 C93 44 72 52 54 70 Z" fill={colors.c} opacity="0.13" />
        <path d="M260 23 L272 54 L305 58 L279 78 L287 111 L260 92 L232 111 L240 78 L214 58 L247 54 Z" fill={colors.c} opacity={deck === "cleric" ? "0.5" : "0.18"} />
        <path d="M146 54 L173 54 L173 166 L146 166 Z" fill="#050507" opacity="0.56" />
        <path d="M112 96 L207 96 L197 121 L121 121 Z" fill="#050507" opacity="0.58" />
        <path d="M158 37 L198 173 L158 154 L118 173 Z" fill={colors.glow} opacity="0.16" />
        <rect width="320" height="220" rx="18" filter={`url(#rough-${deck}-${icon})`} />
      </svg>
      <div className="dark-art__sigil" data-tooltip={tooltip} title={tooltip}>
        <FantasyIcon name={artIcon} className={compact ? "h-8 w-8" : "h-16 w-16"} />
      </div>
    </div>
  );
}

export function TokenArtwork({ unitIcon, side }: { unitIcon: string; side: "heroes" | "dm" }) {
  const tooltip = fantasyIconTooltip(unitIcon);
  return (
    <div className={`token-art ${side}`} data-tooltip={tooltip} title={tooltip}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <path d="M40 6 C55 14 65 27 66 43 C67 60 56 72 40 76 C24 72 13 60 14 43 C15 27 25 14 40 6 Z" />
        <path d="M25 54 C31 40 49 40 55 54 C50 61 30 61 25 54 Z" />
        <path d="M29 28 C34 19 46 19 51 28 L47 45 L33 45 Z" />
      </svg>
      <FantasyIcon name={unitIcon} className="token-art__icon" />
    </div>
  );
}
