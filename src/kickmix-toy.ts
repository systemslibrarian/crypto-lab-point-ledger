export type Operands = readonly [number, number, number];

export function applyToyCCX(state: number, width: number, operands: Operands, checkAliasing = true) {
  if (!Number.isInteger(width) || width < 1 || width > 8) throw new RangeError('The toy supports one to eight classical basis bits.');
  if (!Number.isInteger(state) || state < 0 || state >= 2 ** width) throw new RangeError('State is outside the toy register.');
  if (operands.some(operand => !Number.isInteger(operand) || operand < 0 || operand >= width)) throw new RangeError('Operand is outside the toy register.');
  if (checkAliasing && new Set(operands).size !== 3) throw new RangeError('Rejected: CCX operands must be distinct.');
  const [firstControl, secondControl, target] = operands;
  const controlsSet = ((state >> firstControl) & 1) === 1 && ((state >> secondControl) & 1) === 1;
  return controlsSet ? state ^ (1 << target) : state;
}

export function toyRoundTrip(aliased: boolean, checkAliasing: boolean) {
  const width = aliased ? 1 : 3;
  const operands: Operands = aliased ? [0, 0, 0] : [0, 1, 2];
  try {
    const rows = Array.from({ length: 2 ** width }, (_, state) => {
      const forward = applyToyCCX(state, width, operands, checkAliasing);
      const reverse = applyToyCCX(forward, width, operands, checkAliasing);
      return { state, forward, reverse };
    });
    return { accepted: true, reversible: rows.every(row => row.state === row.reverse), rows, reason: null, width };
  } catch (error) {
    return { accepted: false, reversible: false, rows: [], reason: error instanceof Error ? error.message : String(error), width };
  }
}