import { ArrowLeft, Crown, Gem, ScrollText } from "lucide-react";
import { DMGameCard } from "../Cards/GameCard";
import { dmCards } from "../../game/data/dmCards";
import { dmUpgradeById, dmUpgrades } from "../../game/data/upgrades";
import { useGameStore } from "../../game/state/store";

export function DMLoadoutScreen() {
  const campaign = useGameStore((state) => state.campaign);
  const setScreen = useGameStore((state) => state.setScreen);

  if (!campaign) return null;
  const deckSet = new Set(campaign.dm.deckCardIds);

  return (
    <section className="screen-shell h-full overflow-auto p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Dungeon Master</div>
          <h2 className="font-display text-4xl font-black text-fuchsia-100">Deck and Schemes</h2>
        </div>
        <button className="secondary-button" onClick={() => setScreen("campaign")}>
          <ArrowLeft size={18} />
          Campaign
        </button>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <div className="panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Dungeon Deck</div>
              <h3 className="font-display text-2xl font-bold text-fuchsia-100">
                {campaign.dm.deckCardIds.length} card deck
              </h3>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="stat-chip"><Crown size={14} /> Level {campaign.dm.level}</span>
              <span className="stat-chip"><Gem size={14} /> Dread {campaign.dm.dread}</span>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {dmCards.map((card) => (
              <div key={card.id} className="relative">
                <DMGameCard card={card} selected={deckSet.has(card.id)} />
                <div className={`loadout-badge ${deckSet.has(card.id) ? "active dm" : ""}`}>
                  {deckSet.has(card.id) ? "Deck" : "Locked"}
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="panel p-5">
          <div className="eyebrow">Unlocked Upgrades</div>
          <h3 className="font-display text-2xl font-bold text-amber-100">Monster Progression</h3>
          <div className="mt-4 grid gap-3">
            {dmUpgrades.map((upgrade) => {
              const unlocked = campaign.dm.upgrades.includes(upgrade.id);
              const available = !upgrade.level || campaign.dm.level >= upgrade.level;
              return (
                <div key={upgrade.id} className={`upgrade-row ${unlocked ? "unlocked" : ""} ${!available ? "locked" : ""}`}>
                  <ScrollText size={18} />
                  <div>
                    <strong>{dmUpgradeById[upgrade.id].name}</strong>
                    <span>{upgrade.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
