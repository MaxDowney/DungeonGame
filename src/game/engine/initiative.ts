import type { InitiativeEntry, InitiativeState, Unit } from "../types";
import { rollDie } from "./dice";

const canJoinInitiative = (unit: Unit): boolean => !unit.defeated && !unit.downed;

export const rollInitiative = (heroes: Unit[], monsters: Unit[]): InitiativeState => {
  const order = [...heroes, ...monsters]
    .filter(canJoinInitiative)
    .map(
      (unit): InitiativeEntry => {
        const roll = rollDie(10);
        return {
          unitId: unit.id,
          unitName: unit.name,
          side: unit.side,
          roll,
          bonus: unit.initiative,
          total: roll + unit.initiative,
        };
      },
    )
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.bonus - a.bonus ||
        a.unitName.localeCompare(b.unitName),
    );

  return {
    order,
    currentIndex: 0,
  };
};

export const nextInitiativeIndex = (
  initiative: InitiativeState,
  units: Unit[],
  startIndex = initiative.currentIndex + 1,
): number | undefined => {
  for (let index = startIndex; index < initiative.order.length; index += 1) {
    const unit = units.find((candidate) => candidate.id === initiative.order[index].unitId);
    if (unit && canJoinInitiative(unit) && !unit.activated) return index;
  }

  return undefined;
};

export const activeInitiativeUnitId = (initiative: InitiativeState): string | null =>
  initiative.order[initiative.currentIndex]?.unitId ?? null;
