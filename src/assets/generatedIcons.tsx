import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import * as Icons from "lucide-react";

const iconMap: Record<string, string> = {
  helm: "Shield",
  axe: "Axe",
  bow: "Crosshair",
  sun: "Sun",
  club: "Hammer",
  hound: "Flame",
  shield: "Shield",
  "shield-plus": "ShieldPlus",
  "shield-check": "ShieldCheck",
  swords: "Swords",
  sword: "Sword",
  megaphone: "Megaphone",
  route: "Route",
  flame: "Flame",
  crosshair: "Crosshair",
  "bow-arrow": "Crosshair",
  footprints: "Footprints",
  sparkles: "Sparkles",
  sparkle: "Sparkles",
  "circle-dashed": "CircleDashed",
  "heart-pulse": "HeartPulse",
  "heart-plus": "HeartPlus",
  flag: "Flag",
  castle: "Castle",
  mountain: "Mountain",
  "fast-forward": "FastForward",
  skull: "Skull",
  pin: "Pin",
  "scan-eye": "Eye",
  "cloud-fog": "CloudFog",
  "sun-medium": "Sun",
  "badge-plus": "BadgePlus",
  "flame-kindling": "Flame",
  hammer: "Hammer",
  "rotate-ccw": "RotateCcw",
  "move-right": "MoveRight",
  eye: "Eye",
  zap: "Zap",
  heart: "Heart",
  "badge-alert": "BadgeAlert",
  send: "Send",
  shuffle: "Shuffle",
  focus: "Focus",
  waves: "Waves",
  droplet: "Droplet",
  crown: "Crown",
  scan: "Scan",
  gem: "Gem",
  dice: "Dices",
  target: "Target",
  book: "BookOpen",
  save: "Save",
  settings: "Settings",
  bug: "Bug",
  users: "Users",
  scroll: "ScrollText",
  play: "Play",
  x: "X",
  plus: "Plus",
  minus: "Minus",
  door: "DoorOpen",
  hourglass: "Hourglass",
};

const tooltipMap: Record<string, string> = {
  helm: "Guardian / Tank: defensive hero cards that protect allies, Hold threat, and control Current Target.",
  axe: "Berserker / Melee DPS: high-damage hero cards that hit hard and usually generate more Pull.",
  bow: "Ranger / Ranged DPS: precision hero cards with long range, Accuracy bonuses, and better critical chances.",
  sun: "Cleric / Healer: healing and support hero cards, including revival and protective blessings.",
  crown: "Dungeon Master card: spends Doom for traps, monster tricks, and threat manipulation.",
  skull: "Monster action: printed monster abilities paid for with that monster's AP.",
  shield: "Defence or guard: reduces incoming damage after an attack hits.",
  "shield-plus": "Defensive support: adds protection, mitigation, or temporary defence.",
  swords: "Attack: chooses a target, rolls d20 + Accuracy against DT, then rolls damage on a hit.",
  sword: "Melee attack: close-range weapon strike.",
  target: "Targeting: range, line of sight, DT, Current Target, or valid attack target.",
  gem: "Resource or initiative marker. Check the label beside it for AP, Doom, Glory, Dread, or initiative.",
  hourglass: "Recovery or Rest: AP gained at round end, or Recovery + d3 when resting.",
  zap: "AP or Speed: action fuel, movement allowance, or fast movement.",
  heart: "Health: current HP and maximum HP.",
  door: "Interact: open doors or use adjacent objectives.",
  dice: "Manual dice: roll the shown die expression to resolve the pending effect.",
  scroll: "Rules, narration, or room text.",
};

export const fantasyIconTooltip = (name: string): string =>
  tooltipMap[name] ?? tooltipMap[name.toLowerCase()] ?? `${name}: game icon. Hover nearby labels for exact rules.`;

export const FantasyIcon = ({
  name,
  className,
  strokeWidth = 1.8,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) => {
  const componentName = iconMap[name] ?? iconMap[name.toLowerCase()] ?? "Circle";
  const Icon = ((Icons as unknown as Record<string, ComponentType<LucideProps>>)[componentName] ??
    Icons.Circle) as ComponentType<LucideProps>;
  return <Icon className={className} strokeWidth={strokeWidth} />;
};
