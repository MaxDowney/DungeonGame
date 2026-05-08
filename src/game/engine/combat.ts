import type { DiceExpression, Unit } from "../types";
import { rollDice } from "./dice";

export const effectiveDefense = (unit: Unit): number => {
  const conditionPenalty = unit.conditions.some((condition) => condition.type === "Vulnerable")
    ? -1
    : 0;
  return Math.max(0, unit.defense + (unit.tempDefense ?? 0) + conditionPenalty);
};

export const damageDiceForHero = (
  hero: Unit,
  extraDice: DiceExpression[] = [],
  includeWeapon = true,
): DiceExpression[] => {
  const dice = includeWeapon && hero.weapon ? [hero.weapon.die] : [];
  return [...dice, ...(hero.damageBoostDice ?? []), ...extraDice];
};

export const resolveDamage = (
  attacker: Unit,
  defender: Unit,
  label: string,
  dice: DiceExpression[],
  flat = 0,
  ignoreDefense = 0,
): { defender: Unit; roll: ReturnType<typeof rollDice>; damage: number; downed: boolean } => {
  const weakenedPenalty = attacker.conditions.some((condition) => condition.type === "Weakened")
    ? -2
    : 0;
  const roll = rollDice(label, dice, flat + weakenedPenalty);
  const defendedBy = Math.max(0, effectiveDefense(defender) - ignoreDefense);
  const guardReduction = defender.defending ?? 0;
  const damage = Math.max(0, roll.total - defendedBy - guardReduction);
  const hp = Math.max(0, defender.hp - damage);
  const downed = defender.side === "heroes" && hp === 0;
  const defeated = defender.side === "dm" && hp === 0;
  return {
    defender: {
      ...defender,
      hp,
      downed,
      defeated,
      defending: undefined,
    },
    roll,
    damage,
    downed,
  };
};

export const resolveHealing = (
  healer: Unit,
  target: Unit,
  label: string,
  dice: DiceExpression[],
  revive = false,
): { target: Unit; roll: ReturnType<typeof rollDice>; healed: number } => {
  const roll = rollDice(label, dice, healer.power);
  const canHeal = !target.defeated && (!target.downed || revive);
  const before = target.hp;
  const hp = canHeal ? Math.min(target.maxHp, target.hp + roll.total) : target.hp;
  return {
    target: {
      ...target,
      hp,
      downed: hp > 0 ? false : target.downed,
    },
    roll,
    healed: hp - before,
  };
};
