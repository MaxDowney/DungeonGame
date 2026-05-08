import { motion } from "framer-motion";

export function APTokens({ current, max, compact = false }: { current: number; max: number; compact?: boolean }) {
  const tooltip = `AP: Action Points. This figure has ${current} of ${max}. Spend AP on movement, attacks, cards, defence, interaction, or rest.`;
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "max-w-24" : ""}`} title={tooltip} data-tooltip={tooltip}>
      {Array.from({ length: max }).map((_, index) => {
        const lit = index < current;
        return (
          <motion.span
            key={index}
            layout
            animate={{
              scale: lit ? 1 : 0.76,
              opacity: lit ? 1 : 0.28,
              boxShadow: lit ? "0 0 14px rgba(255, 180, 87, .8)" : "0 0 0 rgba(0,0,0,0)",
            }}
            className={`h-3 w-3 rounded-full border ${lit ? "border-amber-100 bg-amber-300" : "border-stone-500 bg-stone-800"}`}
          />
        );
      })}
    </div>
  );
}
