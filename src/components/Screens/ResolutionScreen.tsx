import { motion } from "framer-motion";
import { ArrowRight, Crown, Shield, Sparkles } from "lucide-react";
import { HeroGameCard } from "../Cards/GameCard";
import { heroCardById } from "../../game/data/heroCards";
import { heroTemplateById } from "../../game/data/heroes";
import { mapById } from "../../game/data/maps";
import { dmUpgradeById } from "../../game/data/upgrades";
import { useGameStore } from "../../game/state/store";

export function ResolutionScreen() {
  const campaign = useGameStore((state) => state.campaign);
  const heroSelections = useGameStore((state) => state.heroSelections);
  const dmUpgradeSelection = useGameStore((state) => state.dmUpgradeSelection);
  const selectRewardCard = useGameStore((state) => state.selectRewardCard);
  const selectRewardUpgrade = useGameStore((state) => state.selectRewardUpgrade);
  const confirmRewards = useGameStore((state) => state.confirmRewards);

  const rewards = campaign?.pendingLevelUp;
  if (!campaign || !rewards) return null;
  const map = mapById[rewards.mapId];

  return (
    <section className="screen-shell h-full overflow-auto p-5">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="panel parchment mx-auto max-w-7xl p-6 text-stone-950"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow text-stone-700">Map Resolution</div>
            <h2 className="font-display text-4xl font-black">{map.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-stone-700">{map.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="resolution-score hero">
              <Shield size={22} />
              <span>Glory</span>
              <strong>+{rewards.glory}</strong>
            </div>
            <div className="resolution-score dm">
              <Crown size={22} />
              <span>Dread</span>
              <strong>+{rewards.dread}</strong>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className={`objective-result ${rewards.heroObjectiveComplete ? "success" : ""}`}>
            <strong>Hero Objective</strong>
            <span>{rewards.heroObjectiveComplete ? "Completed" : "Failed forward"}</span>
          </div>
          <div className={`objective-result dm ${rewards.dmSchemeComplete ? "success" : ""}`}>
            <strong>DM Scheme</strong>
            <span>{rewards.dmSchemeComplete ? "Completed" : "Contained"}</span>
          </div>
        </div>

        <div className="mt-7">
          <div className="eyebrow text-stone-700">Hero Level Ups</div>
          <div className="mt-3 grid gap-5 xl:grid-cols-2">
            {Object.entries(rewards.heroChoices).map(([heroId, choices]) => {
              const hero = heroTemplateById[heroId];
              const selected = heroSelections[heroId] ?? choices[0];
              return (
                <article key={heroId} className="resolution-hero">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-2xl font-bold">{hero.name}</h3>
                      <p className="text-sm text-stone-700">
                        Advances to level {Math.min(5, campaign.heroes[heroId].level + 1)}.
                        {rewards.scars[heroId] ? " Gains a Scar." : " No new Scar."}
                      </p>
                    </div>
                    <Sparkles className="text-amber-700" />
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-3">
                    {choices.length ? (
                      choices.map((cardId) => (
                        <HeroGameCard
                          key={cardId}
                          card={heroCardById[cardId]}
                          selected={selected === cardId}
                          onClick={() => selectRewardCard(heroId, cardId)}
                        />
                      ))
                    ) : (
                      <div className="rounded-md border border-stone-900/15 bg-white/30 p-4 text-sm text-stone-700">
                        No new class cards at this level. Existing hand remains ready.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-7">
          <div className="eyebrow text-stone-700">DM Upgrade</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {rewards.dmUpgradeChoices.map((upgradeId) => {
              const upgrade = dmUpgradeById[upgradeId];
              return (
                <button
                  key={upgradeId}
                  className={`upgrade-choice ${dmUpgradeSelection === upgradeId ? "selected" : ""}`}
                  onClick={() => selectRewardUpgrade(upgradeId)}
                >
                  <strong>{upgrade.name}</strong>
                  <span>{upgrade.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button className="primary-button dark" onClick={confirmRewards}>
            Continue Campaign
            <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>
    </section>
  );
}
