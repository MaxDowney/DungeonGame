import { motion } from "framer-motion";
import { Crown, ScrollText, Shield, Swords, Users } from "lucide-react";
import { campaignDefinition } from "../../game/data/campaign";
import { campaignMaps } from "../../game/data/maps";
import { dmUpgradeById } from "../../game/data/upgrades";
import { heroTemplateById } from "../../game/data/heroes";
import { useGameStore } from "../../game/state/store";

export function CampaignScreen() {
  const campaign = useGameStore((state) => state.campaign);
  const startCurrentMap = useGameStore((state) => state.startCurrentMap);
  const setScreen = useGameStore((state) => state.setScreen);

  if (!campaign) return null;
  const currentMap = campaignMaps[campaign.currentMapIndex] ?? campaignMaps[campaignMaps.length - 1];

  return (
    <section className="screen-shell grid h-full gap-5 p-5 lg:grid-cols-[1.4fr_.9fr]">
      <div className="panel relative overflow-hidden p-6">
        <div className="absolute inset-0 campaign-map-bg" />
        <div className="relative z-10">
          <div className="eyebrow">Campaign</div>
          <h2 className="font-display text-4xl font-black text-amber-100">{campaign.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
            Three linked delves, one table, a pile of glowing AP, and a Dungeon Master with a
            dangerous hand.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="score-card glory">
              <Shield size={20} />
              <span>Glory</span>
              <strong>{campaign.glory}</strong>
            </div>
            <div className="score-card dread">
              <Crown size={20} />
              <span>Dread</span>
              <strong>{campaign.dread}</strong>
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-8 h-[48vh] min-h-80">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M18 62 C 30 45, 38 42, 50 36 S 67 44, 78 58"
              fill="none"
              stroke="rgba(234,179,8,.45)"
              strokeWidth="1.4"
              strokeDasharray="3 3"
            />
          </svg>
          {campaignDefinition.locations.map((location, index) => {
            const map = campaignMaps.find((item) => item.id === location.mapId)!;
            const active = index === campaign.currentMapIndex;
            const complete = campaign.completedMaps.includes(location.mapId);
            return (
              <motion.div
                key={location.mapId}
                className={`campaign-node ${active ? "active" : ""} ${complete ? "complete" : ""}`}
                style={{ left: `${location.x}%`, top: `${location.y}%` }}
                animate={{ scale: active ? [1, 1.05, 1] : 1 }}
                transition={{ repeat: active ? Infinity : 0, duration: 2.2 }}
              >
                <div className="campaign-node__orb">{location.act}</div>
                <div className="campaign-node__label">
                  <strong>{location.name}</strong>
                  <span>{map.objective.hero}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <aside className="grid min-h-0 gap-5">
        <div className="panel p-5">
          <div className="eyebrow">Next Map</div>
          <h3 className="font-display text-2xl font-bold text-amber-100">{currentMap.name}</h3>
          <p className="mt-2 text-sm leading-6 text-stone-300">{currentMap.subtitle}</p>
          <div className="mt-4 rounded-md border border-amber-100/15 bg-black/25 p-3 text-sm">
            <div className="text-amber-100">Hero objective</div>
            <div className="text-stone-300">{currentMap.objective.hero}</div>
            <div className="mt-3 text-red-200">DM scheme</div>
            <div className="text-stone-300">{currentMap.objective.dm}</div>
          </div>
          <button className="primary-button mt-5 w-full" onClick={startCurrentMap}>
            <Swords size={18} />
            Start Next Map
          </button>
        </div>
        <div className="panel grid gap-3 p-5">
          <div className="flex gap-3">
            <button className="secondary-button flex-1" onClick={() => setScreen("heroLoadout")}>
              <Users size={18} />
              Hero Roster
            </button>
            <button className="secondary-button flex-1" onClick={() => setScreen("dmLoadout")}>
              <ScrollText size={18} />
              DM Loadout
            </button>
          </div>
          <div className="grid gap-2">
            {Object.values(campaign.heroes).map((progress) => {
              const hero = heroTemplateById[progress.heroId];
              return (
                <div key={progress.heroId} className="roster-row">
                  <span style={{ background: hero.color }} />
                  <div>
                    <strong>{hero.name}</strong>
                    <small>Level {progress.level} / Scars {progress.scars}</small>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-md border border-fuchsia-300/20 bg-fuchsia-950/20 p-3 text-sm text-stone-300">
            <div className="font-display text-lg text-fuchsia-100">Dungeon Master Level {campaign.dm.level}</div>
            <div className="mt-1">
              {campaign.dm.upgrades.length
                ? campaign.dm.upgrades.map((id) => dmUpgradeById[id]?.name).join(", ")
                : "No upgrades yet."}
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
