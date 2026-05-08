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
