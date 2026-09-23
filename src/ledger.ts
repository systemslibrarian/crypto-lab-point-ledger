import { parameters } from './sources';

export function attackResources(toffoliPerAddition: number, qubitsPerAddition: number) {
  if (!Number.isFinite(toffoliPerAddition) || toffoliPerAddition < 0 || !Number.isFinite(qubitsPerAddition) || qubitsPerAddition < 0) {
    throw new RangeError('Resource counts must be finite and nonnegative.');
  }
  const additions = 2 * parameters.fieldBits / parameters.window - 4;
  const lookupPerAddition = 3 * 2 ** parameters.window;
  return {
    additions,
    lookupPerAddition,
    lookupTotal: lookupPerAddition * additions,
    arithmeticTotal: toffoliPerAddition * additions,
    toffoli: (toffoliPerAddition + lookupPerAddition) * additions,
    qubits: qubitsPerAddition + parameters.window,
  };
}

export function clockMinutes(toffoli: number, primed = false) {
  return toffoli * parameters.toffoliMicroseconds * 1e-6 * parameters.overhead / 60 * (primed ? parameters.primedFactor : 1);
}

export function onSpendProbability(attackMinutes: number, blockMinutes: number) {
  if (!Number.isFinite(attackMinutes) || attackMinutes < 0 || !Number.isFinite(blockMinutes) || blockMinutes <= 0) {
    throw new RangeError('Attack time must be nonnegative and block time must be positive.');
  }
  return Math.exp(-attackMinutes / blockMinutes);
}