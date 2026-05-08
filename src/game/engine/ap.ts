import type { Unit } from "../types";

export const canSpendAp = (unit: Unit | undefined, cost: number): boolean =>
  Boolean(unit && !unit.defeated && !unit.downed && unit.ap >= cost);

export const spendAp = (unit: Unit, cost: number): Unit => ({
  ...unit,
  ap: Math.max(0, unit.ap - cost),
});

export const recoverAp = (unit: Unit, extra = 0): Unit => {
  if (unit.defeated || unit.downed) return unit;
  const stunned = unit.conditions.find(
    (condition) => condition.type === "Stunned" || condition.type === "Frozen",
  );
  const loss = stunned ? stunned.value ?? 1 : 0;
  return {
    ...unit,
    ap: Math.min(unit.maxAp, unit.ap + unit.recovery + extra - loss),
    defending: undefined,
    damageBoostDice: undefined,
    tempDefense: undefined,
    conditions: unit.conditions
      .map((condition) => ({ ...condition, duration: condition.duration - 1 }))
      .filter((condition) => condition.duration > 0),
  };
};
