import { motion } from "framer-motion";
import { X } from "lucide-react";
import { campaignDefinition, keywordRules } from "../game/data/campaign";
import { useGameStore } from "../game/state/store";

const ruleSections = [
  {
    title: "Object Of The Game",
    text:
      "Dungeon Threat is an asymmetric campaign crawler. Four heroes explore connected rooms and corridors while the Dungeon Master spends Doom, commands monsters, and advances map schemes. The heroes win a map by completing the printed objective. The DM succeeds by completing the scheme, downing heroes, or delaying the party long enough for the dungeon to bite back.",
  },
  {
    title: "Campaign Setup",
    text:
      "Start The Ashen Gate with the Guardian, Berserker, Ranger, and Cleric at level 1. Each hero equips up to six class cards plus universal actions. The DM starts with a ten-card Dungeon deck, Doom at the map value, Dread as the persistent campaign score, and any unlocked upgrades.",
  },
  {
    title: "Map Setup And Exploration",
    text:
      "Place heroes on the starting tiles, reveal what the party can see, read the starting room text, and keep unseen tiles under fog. Empty void outside rooms and corridors is not playable space. Doors block movement while closed; adjacent heroes can Interact to open them. When a door opens, line of sight reveals tiles and monsters beyond it and adds visible monsters to the active dungeon threat.",
  },
  {
    title: "Round Sequence",
    text:
      "At the start of every round, roll initiative for each revealed living figure. Each figure rolls d10 plus its Initiative stat. Sort highest total to lowest and keep that order fixed until the round ends. If a hidden monster is revealed mid-round, it joins the threat and will roll normally in the next round, or enter the current order if it was already waiting.",
  },
  {
    title: "Activations",
    text:
      "On a figure's activation, spend AP to move, attack, defend, interact, play cards, or use monster actions. A figure may take multiple actions while it has AP. When AP reaches 0, activation ends automatically. A player may also end activation early. Instead of acting now, a figure may Wait to keep all AP and move to the end of the current initiative order.",
  },
  {
    title: "AP And Rest",
    text:
      "Move costs 1 or more AP depending on distance. Basic Attack costs 2 AP. Defend and Interact cost 1 AP. Printed cards and monster actions cost their listed AP. Rest can only be chosen before the figure has done anything else that activation. Rest skips the turn and recovers Recovery plus 1d3 AP, up to Max AP.",
  },
  {
    title: "Movement",
    text:
      "Movement uses the square grid. One Move AP lets a figure move up to Speed squares, and extra AP can extend the move in the same action. Heroes may move through heroes, monsters may move through monsters, but heroes cannot move through monsters and monsters cannot move through heroes. Walls, void, and closed doors block movement.",
  },
  {
    title: "Line Of Sight And Range",
    text:
      "Ranges use grid distance shown by the board. Ranged and many magic attacks require line of sight. Walls block line of sight. Open doors allow sight through them. Fog of war clears tile by tile whenever a hero can see that tile; the party does not need to step into a room to learn what visible tiles actually are.",
  },
  {
    title: "Attack Roll",
    text:
      "Every attack first rolls d20 plus the attacker's Accuracy plus any card or action modifier. If the total is equal to or greater than the target's DT, the attack hits. DT is the chance-to-hit defence. Defence is separate and reduces damage only after a hit.",
  },
  {
    title: "Critical Hits",
    text:
      "A natural 20 always hits and is a Critical Hit. Critical +X lowers the natural roll needed for a critical by X, to a maximum bonus of +5. Critical range is based only on the natural d20 roll. A critical hit doubles total raw damage before Defence is subtracted.",
  },
  {
    title: "Critical Failures",
    text:
      "A natural 1 always misses and is a Critical Failure. Fumble +X increases the failure range by X, to a maximum bonus of +5. Critical Failure takes priority over Critical Hit if ranges ever overlap. On a critical failure, the attacker loses all remaining AP, gains Exposed until its next activation, and resolves the dramatic failure effects.",
  },
  {
    title: "Damage And Healing",
    text:
      "On a hit, roll the card or action's damage dice, add flat bonuses and level bonuses, double that raw total on a critical, then subtract Defence and temporary reductions. HP cannot exceed Max HP. Healing and support cards do not roll to hit unless they say they are attacks.",
  },
  {
    title: "Multi-Target And AoE",
    text:
      "When an attack affects multiple targets, resolve each target separately. Roll to hit each target, then roll that target's damage separately if the attack hits. This keeps critical hits, misses, Defence, conditions, and agro honest for every affected figure.",
  },
  {
    title: "Agro And Pressure",
    text:
      "Each monster tracks a Current Target and Pressure from 0 to 3. Monsters normally attack their Current Target. Pull from another hero lowers Pressure and can steal the monster's attention. Hold from the Current Target raises Pressure and makes that monster harder to peel away. Set Target directly chooses the Current Target and Pressure value.",
  },
  {
    title: "Doom And Dungeon Cards",
    text:
      "The DM gains 1 Doom at the start of each round and may gain more from effects. Doom is spent on Dungeon cards, schemes, traps, and tactical surprises. The DM draws a Dungeon card at round end, keeps a hand of up to five, and normally plays one Dungeon card each round unless a card says otherwise.",
  },
  {
    title: "Random Encounters",
    text:
      "Random Encounters are checked only at the end of a round, just before the next initiative roll. If no revealed monsters remain and no monster was defeated during that round, draw one random encounter card. Encounters can reveal monsters, treasure, or NPCs. Encounter monsters roll initiative with everyone else in the next round.",
  },
  {
    title: "Conditions",
    text:
      "Conditions adjust tactics without heavy bookkeeping. Slowed reduces movement, Rooted prevents movement, Weakened reduces outgoing damage, Vulnerable increases incoming damage, Stunned or Frozen costs AP on activation, Guarded and Blessed help allies, and Exposed represents a failed attack leaving a figure open.",
  },
  {
    title: "Downed Heroes And Defeated Monsters",
    text:
      "A hero at 0 HP becomes Downed, gains campaign Scar pressure, and cannot activate normally. Healing that says it can revive can bring a downed hero back. A monster at 0 HP is defeated and removed from play. Defeating monsters can complete objectives and prevents random encounter draws for that round.",
  },
  {
    title: "Map Resolution",
    text:
      "When the hero objective or DM scheme is complete, resolve the map. Award Glory and Dread, apply Scars and Boons, level heroes and the DM, choose new cards or upgrades, then save campaign progress before moving to the next location.",
  },
];

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
          {ruleSections.map((section) => (
            <div key={section.title} className="rule-card">
              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </div>
          ))}
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
