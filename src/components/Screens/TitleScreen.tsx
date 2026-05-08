import { motion } from "framer-motion";
import { Play, ScrollText, Settings, Swords } from "lucide-react";
import { loadSnapshot } from "../../game/state/persistence";
import { useGameStore } from "../../game/state/store";

export function TitleScreen() {
  const startNewCampaign = useGameStore((state) => state.startNewCampaign);
  const continueCampaign = useGameStore((state) => state.continueCampaign);
  const startCurrentMap = useGameStore((state) => state.startCurrentMap);
  const hasSave = Boolean(loadSnapshot());

  const quickTest = () => {
    startNewCampaign();
    window.setTimeout(() => useGameStore.getState().startCurrentMap(), 20);
  };

  return (
    <section className="relative grid h-full place-items-center overflow-hidden px-6 py-10">
      <div className="absolute inset-0 title-vault" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative flex w-full max-w-6xl flex-col items-start"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.32em] text-amber-200 shadow-glow">
          <Swords size={16} />
          Hot-seat dungeon campaign
        </div>
        <h1 className="font-display text-[clamp(4rem,12vw,9.5rem)] font-black leading-[0.82] tracking-normal text-amber-100 title-text">
          DUNGEON
          <br />
          THREAT
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-200/86">
          Four heroes descend into The Ashen Gate while the Dungeon Master spends Doom, twists
          agro, and drives monsters through a tactile fantasy board.
        </p>
        <div className="mt-10 grid w-full max-w-lg gap-3 sm:grid-cols-2">
          <button className="primary-button" onClick={startNewCampaign}>
            <Play size={18} />
            New Campaign
          </button>
          <button className="secondary-button" onClick={continueCampaign} disabled={!hasSave}>
            <ScrollText size={18} />
            Continue
          </button>
          <button className="secondary-button" onClick={quickTest}>
            <Swords size={18} />
            Quick Test
          </button>
          <button className="secondary-button" onClick={startCurrentMap} disabled>
            <Settings size={18} />
            Settings
          </button>
        </div>
      </motion.div>
    </section>
  );
}
