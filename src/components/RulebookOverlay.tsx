import { motion } from "framer-motion";
import { X } from "lucide-react";
import { campaignDefinition, keywordRules } from "../game/data/campaign";
import { useGameStore } from "../game/state/store";

export function RulebookOverlay() {
  const toggleHelp = useGameStore((state) => state.toggleHelp);
  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="panel parchment max-h-[86vh] w-full max-w-5xl overflow-auto p-6 text-stone-950"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow text-stone-700">Rulebook</div>
            <h2 className="font-display text-3xl font-black tracking-wide text-stone-950">
              DUNGEON THREAT
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-stone-700">
              {campaignDefinition.name} is a 4-hero hot-seat campaign against a Dungeon Master
              using AP, cards, Current Target, Pressure, Doom, and Dread.
            </p>
          </div>
          <button className="icon-button dark" onClick={toggleHelp} title="Close rulebook">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rule-card">
            <h3>Turn Structure</h3>
            <p>
              Each round, every living hero and monster rolls d10 plus Initiative. That fixed
              order runs from highest total to lowest until every ready figure has acted. End of
              round recovers AP, advances tracks, draws a Dungeon card, and adds Doom.
            </p>
          </div>
          <div className="rule-card">
            <h3>Action Economy</h3>
            <p>
              Move costs 1 AP, Basic Attack costs 2 AP, Defend and Interact cost 1 AP. Class
              cards spend their printed gem cost and can add damage, healing, buffs, reactions,
              Pull, Hold, or Set Target.
            </p>
          </div>
          <div className="rule-card">
            <h3>Agro</h3>
            <p>
              Monsters track only Current Target and Pressure. Pull can steal attention. Hold makes
              a monster more committed to its target. Pressure pips on monster tokens show the
              monster's grip at a glance.
            </p>
          </div>
          <div className="rule-card">
            <h3>Campaign</h3>
            <p>
              Win or lose, maps award Glory, Dread, Scars, Boons, hero levels, DM levels, cards,
              and upgrades. The short campaign has three connected maps and persists locally.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(keywordRules).map(([keyword, rule]) => (
            <div key={keyword} className="keyword-card">
              <strong>{keyword}</strong>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
