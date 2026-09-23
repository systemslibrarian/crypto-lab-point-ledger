import { figureCodec, parameters } from './sources';

export type Pair = readonly [0 | 1, 0 | 1];
export type DialogOptions = {
  prime?: bigint;
  iterationFactor?: number;
  paddingFactor?: number;
  capture?: boolean;
};
export type DialogStep = {
  index: number;
  upper: bigint;
  lower: bigint;
  width: number;
  pair: Pair;
  fits: boolean;
};
export type ReplayStep = { index: number; first: bigint; second: bigint; sumEqualsPrime: boolean };

export function bitLength(value: bigint) {
  return value === 0n ? 0 : value.toString(2).length;
}

export function parseInteger(text: string): bigint {
  const trimmed = text.trim();
  if (trimmed.length > 4096 || !/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(trimmed)) {
    throw new TypeError('Enter a nonnegative decimal integer or a hexadecimal integer beginning with 0x.');
  }
  return BigInt(trimmed);
}

export function dialogBudget(bits: number, iterationFactor: number) {
  if (!Number.isFinite(iterationFactor) || iterationFactor < -8 || iterationFactor > 8) {
    throw new RangeError('Iteration factor must be between -8 and 8.');
  }
  return Math.max(3, Math.ceil((parameters.iterationMeanRatio * bits + iterationFactor * Math.sqrt(bits)) / 3) * 3);
}

export function scheduledWidth(bits: number, index: number, paddingFactor: number) {
  return Math.max(1, Math.min(bits, Math.ceil(bits - parameters.shrinkBitsPerStep * index + paddingFactor * Math.sqrt(bits))));
}

export function recordEuclid(input: bigint, options: DialogOptions = {}) {
  const prime = options.prime ?? parameters.fieldPrime;
  const iterationFactor = options.iterationFactor ?? parameters.iterationFactor;
  const paddingFactor = options.paddingFactor ?? parameters.paddingFactor;
  if (prime < 3n || prime % 2n === 0n) throw new RangeError('The modulus must be an odd prime.');
  if (input < 0n) throw new RangeError('The multiplier must be nonnegative.');
  if (!Number.isFinite(paddingFactor) || paddingFactor < 0 || paddingFactor > 8) {
    throw new RangeError('Padding factor must be between 0 and 8.');
  }
  const reduced = input % prime;
  if (reduced === 0n) throw new RangeError('x = 0 is rejected: multiplication by zero is not invertible, so this dialog cannot restore x.');
  const bits = bitLength(prime);
  const budget = dialogBudget(bits, iterationFactor);
  let upper = prime;
  let lower = reduced;
  let iterations = 0;
  let overflowAt: number | null = null;
  const pairs: Pair[] = [];
  const steps: DialogStep[] = [];
  for (let index = 0; index < budget; index += 1) {
    const width = scheduledWidth(bits, index, paddingFactor);
    const fits = bitLength(upper) <= width && bitLength(lower) <= width;
    if (!fits && overflowAt === null) overflowAt = index;
    const odd = Number(lower & 1n) as 0 | 1;
    const swap = (odd === 1 && upper > lower ? 1 : 0) as 0 | 1;
    const pair: Pair = [odd, swap];
    pairs.push(pair);
    if (options.capture !== false) steps.push({ index, upper, lower, width, pair, fits });
    if (lower !== 0n) iterations += 1;
    if (swap) [upper, lower] = [lower, upper];
    if (odd) lower -= upper;
    lower /= 2n;
  }
  const reason = lower !== 0n
    ? `Iteration budget exhausted: v is still ${lower.toString()}.`
    : upper !== 1n
      ? 'The input is not coprime to the modulus.'
      : overflowAt !== null
        ? `Padding overflow at step ${overflowAt + 1}: u or v exceeds the scheduled register width.`
        : null;
  return { prime, reduced, wasReduced: input >= prime, bits, budget, iterations, overflowAt, pairs, steps, upper, lower, reason };
}

export function replayDialog(pairs: readonly Pair[], input: bigint, prime: bigint, capture = true) {
  let first = input % prime;
  let second = 0n;
  const steps: ReplayStep[] = [];
  for (let index = pairs.length - 1; index >= 0; index -= 1) {
    const [odd, swap] = pairs[index];
    second = second * 2n % prime;
    const sumEqualsPrime = odd === 1 && first + second === prime;
    if (odd) second = (second + first) % prime;
    if (swap) [first, second] = [second, first];
    if (capture) steps.push({ index, first, second, sumEqualsPrime });
  }
  return { first, second, steps };
}

export function restoreEuclid(pairs: readonly Pair[], finalUpper: bigint, finalLower: bigint) {
  let upper = finalUpper;
  let lower = finalLower;
  for (let index = pairs.length - 1; index >= 0; index -= 1) {
    const [odd, swap] = pairs[index];
    lower *= 2n;
    if (odd) lower += upper;
    if (swap) [upper, lower] = [lower, upper];
  }
  return { upper, lower };
}

export function checkDialogResult(first: bigint, product: bigint, expected: bigint, restored: bigint, input: bigint, reason: string | null) {
  return reason === null && first === 0n && product === expected && restored === input;
}

export function multiplyDialog(multiplier: bigint, multiplicand: bigint, options: DialogOptions = {}) {
  if (multiplicand < 0n) throw new RangeError('The multiplicand must be nonnegative.');
  const record = recordEuclid(multiplier, options);
  const packed = packTranscript(record.pairs);
  const decoded = unpackTranscript(packed);
  const replay = replayDialog(decoded, multiplicand, record.prime, options.capture !== false);
  const restored = restoreEuclid(decoded, record.upper, record.lower);
  const expected = record.reduced * (multiplicand % record.prime) % record.prime;
  const passed = checkDialogResult(replay.first, replay.second, expected, restored.lower, record.reduced, record.reason);
  return {
    ...record,
    packed,
    replay,
    expected,
    restored: restored.lower,
    passed,
    reason: record.reason ?? (passed ? null : 'Replay mismatch: the result does not match independent BigInt multiplication.'),
  };
}

export function exactIterations(input: bigint, prime: bigint) {
  let upper = prime;
  let lower = input;
  let iterations = 0;
  while (lower !== 0n) {
    const odd = (lower & 1n) === 1n;
    if (odd && upper > lower) [upper, lower] = [lower, upper];
    if (odd) lower -= upper;
    lower /= 2n;
    iterations += 1;
  }
  return iterations;
}

export function pseudoMersenneReduce(value: bigint, bits = parameters.fieldBits, complement: bigint = parameters.fieldComplement) {
  const radix = 1n << BigInt(bits);
  const prime = radix - complement;
  if (value < 0n || value >= 2n * prime) throw new RangeError('This exhibit accepts a sum in [0, 2p).');
  const carry = value / radix;
  const low = value % radix;
  const folded = low + carry * complement;
  const result = folded >= prime ? folded - prime : folded;
  return { carry, low, folded, result, sumEqualsPrime: value === prime };
}

export function encodeTriplet(pairs: readonly Pair[]) {
  if (pairs.length !== 3) throw new RangeError('The Figure 1 codec needs exactly three pairs.');
  const digits = pairs.map(([odd, swap]) => {
    if ((odd !== 0 && odd !== 1) || (swap !== 0 && swap !== 1) || (odd === 0 && swap === 1)) {
      throw new RangeError('Valid transcript pairs are 00, 10 and 11.');
    }
    return odd + swap;
  });
  return figureCodec[digits[0] * 9 + digits[1] * 3 + digits[2]];
}

export function decodeTriplet(word: number): Pair[] {
  const index = (figureCodec as readonly number[]).indexOf(word);
  if (index < 0) throw new RangeError('Unused or malformed five-bit codeword.');
  const pairs: readonly Pair[] = [[0, 0], [1, 0], [1, 1]];
  return [pairs[Math.floor(index / 9)], pairs[Math.floor(index / 3) % 3], pairs[index % 3]];
}

export function packTranscript(pairs: readonly Pair[]) {
  if (pairs.length % 3 !== 0) throw new RangeError('The fixed transcript budget must contain whole triplets.');
  const words: number[] = [];
  for (let index = 0; index < pairs.length; index += 3) words.push(encodeTriplet(pairs.slice(index, index + 3)));
  return words;
}

export function unpackTranscript(words: readonly number[]) {
  return words.flatMap(decodeTriplet);
}