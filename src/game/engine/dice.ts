import type { DiceExpression, DiceRoll } from "../types";

export const parseDice = (expression: DiceExpression): Array<{ sides: number }> => {
  const match = expression.match(/^(\d*)d(3|4|6|8|10|12|20)$/);
  if (!match) return [];
  const count = Number(match[1] || 1);
  const sides = Number(match[2]);
  return Array.from({ length: count }, () => ({ sides }));
};

export const rollDie = (sides: number): number => Math.floor(Math.random() * sides) + 1;

export const rollDice = (
  label: string,
  expressions: DiceExpression[] = [],
  flat = 0,
): DiceRoll => {
  const dice = expressions.flatMap(parseDice).map(({ sides }) => ({
    sides,
    result: rollDie(sides),
  }));
  const total = dice.reduce((sum, die) => sum + die.result, flat);
  return {
    id: crypto.randomUUID(),
    label,
    dice,
    total,
  };
};

export const describeDice = (expressions: DiceExpression[] = [], flat = 0): string => {
  const dice = expressions.length ? expressions.join(" + ") : "";
  if (flat > 0 && dice) return `${dice} + ${flat}`;
  if (flat < 0 && dice) return `${dice} - ${Math.abs(flat)}`;
  if (flat !== 0) return String(flat);
  return dice || "0";
};
