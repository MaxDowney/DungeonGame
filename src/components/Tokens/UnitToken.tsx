import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { TokenArtwork } from "../Art/DarkFantasyArt";
import type { Unit } from "../../game/types";

export function UnitToken({
  unit,
  active,
  selected,
  validTarget,
}: {
  unit: Unit;
  active?: boolean;
  selected?: boolean;
  validTarget?: boolean;
}) {
  const hpPercent = Math.max(0, (unit.hp / unit.maxHp) * 100);
  const tooltip = `${unit.name}: ${unit.side === "heroes" ? unit.role : unit.family}. HP ${unit.hp}/${unit.maxHp}, AP ${unit.ap}/${unit.maxAp}, DT ${unit.dt}, Defence ${unit.defense}, Accuracy ${unit.accuracy >= 0 ? "+" : ""}${unit.accuracy}.`;
  return (
    <motion.div
      layout
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: unit.defeated ? 0.2 : 1, opacity: unit.defeated ? 0 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={`unit-token ${unit.side} ${active ? "active" : ""} ${selected ? "selected" : ""} ${validTarget ? "valid-target" : ""}`}
      style={{ "--unit-color": unit.color } as CSSProperties}
      title={tooltip}
      data-tooltip={tooltip}
    >
      <div className="unit-token__portrait">
        <TokenArtwork unitIcon={unit.portraitGlyph} side={unit.side} />
      </div>
      <div className="unit-token__label">{unit.name.split(" ")[0]}</div>
      <div className="unit-token__hp">
        <span style={{ width: `${hpPercent}%` }} />
      </div>
      {unit.side === "dm" && unit.agro && (
        <div className="unit-token__pressure">
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className={index < unit.agro!.pressure ? "lit" : ""} />
          ))}
        </div>
      )}
      {unit.downed && <div className="unit-token__badge">Down</div>}
    </motion.div>
  );
}
