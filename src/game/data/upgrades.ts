import type { DMUpgrade } from "../types";

export const dmUpgrades: DMUpgrade[] = [
  { id: "thick-hide", name: "Thick Hide", text: "Brutes gain +1 Defence." },
  { id: "vicious-hounds", name: "Vicious Hounds", text: "Demon Hounds gain +1 Speed and +1 damage on Pounce." },
  { id: "dark-ritualist", name: "Dark Ritualist", text: "Cult Priest Ritual gains +1 Doom." },
  { id: "deeper-darkness", name: "Deeper Darkness", text: "Start each map with +1 Doom." },
  { id: "cruel-mechanisms", name: "Cruel Mechanisms", text: "First trap each room costs 1 less Doom." },
  { id: "boss-second-phase", name: "Boss Second Phase", text: "Final boss revives once at half HP." },
  { id: "living-dungeon", name: "Living Dungeon", text: "Once per round, spend 1 Doom to open or close a door." },
  { id: "unstable-threat", name: "Unstable Threat", text: "Once per round, when a hero heals, reduce one monster Pressure by 1." },
  {
    id: "spec-beastmaster",
    name: "Beastmaster",
    level: 3,
    specialization: "Beastmaster",
    text: "Beasts recover +1 AP at end of round.",
  },
  {
    id: "spec-necromancer",
    name: "Necromancer",
    level: 3,
    specialization: "Necromancer",
    text: "First defeated Cult monster each map grants +1 Doom.",
  },
  {
    id: "spec-trapwright",
    name: "Trapwright",
    level: 3,
    specialization: "Trapwright",
    text: "Traps deal +1 AP loss.",
  },
  {
    id: "spec-tyrant",
    name: "Tyrant",
    level: 3,
    specialization: "Tyrant",
    text: "Current Target attacks against heroes gain +1 damage.",
  },
  {
    id: "spec-corrupter",
    name: "Corrupter",
    level: 3,
    specialization: "Corrupter",
    text: "Heroes with Scars suffer -1 initiative on map start.",
  },
];

export const dmUpgradeById = Object.fromEntries(dmUpgrades.map((upgrade) => [upgrade.id, upgrade]));
