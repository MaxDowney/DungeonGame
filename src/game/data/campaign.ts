export const campaignDefinition = {
  id: "ashen-gate",
  name: "The Ashen Gate",
  locations: [
    {
      mapId: "broken-watchtower",
      act: 1,
      name: "Broken Watchtower",
      x: 18,
      y: 62,
    },
    {
      mapId: "cursed-reliquary",
      act: 2,
      name: "Cursed Reliquary",
      x: 50,
      y: 36,
    },
    {
      mapId: "ashen-gate",
      act: 3,
      name: "Ashen Gate",
      x: 78,
      y: 58,
    },
  ],
};

export const keywordRules: Record<string, string> = {
  AP: "Action Points fuel movement, attacks, cards, defence, and interactions.",
  Recovery: "At end of round, living figures regain AP equal to Recovery, up to Max AP.",
  Pull: "If you are not the monster's Current Target, reduce Pressure. Below 0, you become Current Target at Pressure 1.",
  Hold: "If you are Current Target, increase Pressure. Otherwise it works like Pull.",
  Pressure: "A 0 to 3 grip showing how committed a monster is to its Current Target.",
  "Current Target": "The hero a monster normally attacks unless a rule or DM card overrides it.",
  Doom: "Temporary map resource used by the Dungeon Master to play Dungeon cards.",
  Dread: "Persistent campaign resource and score for the Dungeon Master.",
  Glory: "Persistent campaign score for the hero party.",
  Scar: "A campaign wound gained when a hero is downed.",
  Boon: "A campaign reward that gives heroes tactical advantages.",
  Reaction: "A card that can answer a trigger. In this prototype, reactions can be played manually from hand.",
  Resistance: "After hard crowd control, monsters build protection against repeated lock effects.",
};
