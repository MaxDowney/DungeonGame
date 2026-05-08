import { ArrowLeft, Gem, Heart, Shield, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { HeroGameCard } from "../Cards/GameCard";
import { heroCardById } from "../../game/data/heroCards";
import { heroTemplateById } from "../../game/data/heroes";
import { useGameStore } from "../../game/state/store";

export function HeroLoadoutScreen() {
  const campaign = useGameStore((state) => state.campaign);
  const setScreen = useGameStore((state) => state.setScreen);
  const toggleHandCard = useGameStore((state) => state.toggleHandCard);

  if (!campaign) return null;

  return (
    <section className="screen-shell h-full overflow-auto p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Hero Roster</div>
          <h2 className="font-display text-4xl font-black text-amber-100">Loadouts and Scars</h2>
        </div>
        <button className="secondary-button" onClick={() => setScreen("campaign")}>
          <ArrowLeft size={18} />
          Campaign
        </button>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Object.values(campaign.heroes).map((progress) => {
          const hero = heroTemplateById[progress.heroId];
          const hand = new Set(progress.handCardIds);
          return (
            <article key={hero.id} className="panel overflow-hidden p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="hero-portrait" style={{ "--hero-color": hero.color } as CSSProperties}>
                    {hero.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="eyebrow">{hero.role}</div>
                    <h3 className="font-display text-2xl font-bold text-amber-100">{hero.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-300">
                      <span className="stat-chip"><Heart size={13} /> HP {hero.stats.maxHp + (progress.level - 1) * 2}</span>
                      <span className="stat-chip"><Gem size={13} /> AP {hero.stats.maxAp}</span>
                      <span className="stat-chip"><Zap size={13} /> Speed {hero.stats.speed}</span>
                      <span className="stat-chip"><Shield size={13} /> Defence {hero.stats.defense}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-stone-300">
                  <div className="text-amber-100">Level {progress.level}</div>
                  <div>Scars {progress.scars}</div>
                  <div>{progress.handCardIds.length}/6 active cards</div>
                </div>
              </div>
              <div className="mt-5 flex gap-3 overflow-x-auto pb-3">
                {progress.learnedCardIds.map((cardId) => {
                  const card = heroCardById[cardId];
                  return (
                    <div key={cardId} className="relative">
                      <HeroGameCard
                        card={card}
                        selected={hand.has(cardId)}
                        onClick={() => toggleHandCard(hero.id, cardId)}
                      />
                      <div className={`loadout-badge ${hand.has(cardId) ? "active" : ""}`}>
                        {hand.has(cardId) ? "Active" : "Reserve"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
