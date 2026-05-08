import type { Condition, ConditionType, Unit } from "../types";

export const addCondition = (
  unit: Unit,
  type: ConditionType,
  duration = 1,
  value?: number,
): Unit => {
  const other = unit.conditions.filter((condition) => condition.type !== type);
  const condition: Condition = { type, duration, value };
  return {
    ...unit,
    conditions: [...other, condition],
    resistance:
      unit.side === "dm" && ["Rooted", "Stunned", "Frozen"].includes(type)
        ? (unit.resistance ?? 0) + 1
        : unit.resistance,
  };
};

export const removeOneCondition = (unit: Unit): Unit => ({
  ...unit,
  conditions: unit.conditions.slice(1),
});
