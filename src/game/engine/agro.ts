import type { AgroState, Unit } from "../types";

export interface AgroResult {
  monster: Unit;
  changed: boolean;
  text: string;
}

const clampPressure = (pressure: number): number => Math.max(0, Math.min(3, pressure));

export const applyAgro = (
  monster: Unit,
  actingHeroId: string,
  type: "Pull" | "Hold" | "Set Target" | "none",
  amount: number,
  setPressure = 1,
): AgroResult => {
  if (!monster.agro || type === "none") {
    return { monster, changed: false, text: "No agro change." };
  }

  const before: AgroState = { ...monster.agro };
  let next: AgroState = { ...monster.agro };

  if (type === "Set Target") {
    next = { currentTargetId: actingHeroId, pressure: clampPressure(setPressure) };
  }

  if (type === "Pull") {
    if (!next.currentTargetId) {
      next = { currentTargetId: actingHeroId, pressure: clampPressure(setPressure) };
    } else if (next.currentTargetId === actingHeroId) {
      next.pressure = clampPressure(next.pressure + 1);
    } else {
      const reduced = next.pressure - amount;
      if (reduced < 0) {
        next = { currentTargetId: actingHeroId, pressure: clampPressure(setPressure) };
      } else {
        next.pressure = clampPressure(reduced);
      }
    }
  }

  if (type === "Hold") {
    if (next.currentTargetId === actingHeroId) {
      next.pressure = clampPressure(next.pressure + amount);
    } else {
      return applyAgro(monster, actingHeroId, "Pull", amount, setPressure);
    }
  }

  const changed =
    before.currentTargetId !== next.currentTargetId || before.pressure !== next.pressure;
  return {
    monster: { ...monster, agro: next },
    changed,
    text: changed
      ? `${monster.name} threat shifts to ${next.pressure} Pressure.`
      : `${monster.name} threat holds steady.`,
  };
};
