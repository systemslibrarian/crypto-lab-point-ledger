import { describe, expect, it } from 'vitest';
import { bitLength, checkDialogResult, decodeTriplet, dialogBudget, encodeTriplet, exactIterations, multiplyDialog, packTranscript, parseInteger, pseudoMersenneReduce, recordEuclid, replayDialog, restoreEuclid, unpackTranscript, type Pair } from '../src/dialog';
import { parameters } from '../src/sources';

describe('Classical execution of Algorithms 2, 3 and 4', () => {
  it('round-trips all 27 Figure 1 triplets and rejects unused encodings', () => {
    const pairs: Pair[] = [[0, 0], [1, 0], [1, 1]];
    const words = new Set<number>();
    for (const first of pairs) for (const second of pairs) for (const third of pairs) {
      const triplet = [first, second, third];
      const word = encodeTriplet(triplet);
      words.add(word);
      expect(decodeTriplet(word)).toEqual(triplet);
      expect(unpackTranscript(packTranscript(triplet))).toEqual(triplet);
    }
    expect(words.size).toBe(27);
    expect(encodeTriplet([[0, 0], [0, 0], [0, 0]])).toBe(0b00101);
    expect(encodeTriplet([[1, 1], [1, 1], [1, 1]])).toBe(0b11100);
    expect(() => encodeTriplet([[0, 1], [0, 0], [0, 0]])).toThrow();
    expect(() => encodeTriplet([])).toThrow();
    expect(() => decodeTriplet(2)).toThrow();
    expect(() => decodeTriplet(32)).toThrow();
    expect(() => packTranscript([[0, 0]])).toThrow();
  });

  it('matches independent multiplication for every nonzero input in a small prime field', () => {
    for (let multiplier = 1n; multiplier < 31n; multiplier += 1n) {
      for (let multiplicand = 0n; multiplicand < 31n; multiplicand += 1n) {
        const result = multiplyDialog(multiplier, multiplicand, { prime: 31n, iterationFactor: 4, paddingFactor: 4 });
        expect(result.passed).toBe(true);
        expect(result.replay.first).toBe(0n);
        expect(result.replay.second).toBe(multiplier * multiplicand % 31n);
        expect(result.restored).toBe(multiplier);
      }
    }
  });

  it('matches BigInt on boundary inputs while still rejecting width-contract violations', () => {
    const prime = parameters.fieldPrime;
    for (const multiplier of [1n, 2n, 3n, prime - 1n, prime - 2n, prime / 2n, 0xabcdef123456789n]) {
      const result = multiplyDialog(multiplier, prime - 17n, { iterationFactor: 8, paddingFactor: 8 });
      expect(result.replay.first).toBe(0n);
      expect(result.replay.second).toBe(multiplier * (prime - 17n) % prime);
      expect(result.lower).toBe(0n);
      const exceedsWidthContract = multiplier === prime - 1n || multiplier === prime / 2n;
      expect(result.passed).toBe(!exceedsWidthContract);
      if (exceedsWidthContract) expect(result.reason).toContain('Padding overflow');
    }
  });

  it('reduces large inputs explicitly and rejects zero, including a multiple of p', () => {
    const result = multiplyDialog(parameters.fieldPrime + 7n, 23n);
    expect(result.wasReduced).toBe(true);
    expect(result.reduced).toBe(7n);
    expect(result.replay.second).toBe(161n);
    expect(() => multiplyDialog(0n, 1n)).toThrow('x = 0');
    expect(() => multiplyDialog(parameters.fieldPrime, 1n)).toThrow('x = 0');
  });

  it('records all three valid pairs, restores the input, and supports an untraced run', () => {
    const record = recordEuclid(12n, { prime: 31n });
    expect(new Set(record.pairs.map(pair => pair.join('')))).toEqual(new Set(['00', '10', '11']));
    expect(restoreEuclid(record.pairs, record.upper, record.lower)).toEqual({ upper: 31n, lower: 12n });
    expect(multiplyDialog(12n, 17n, { prime: 31n, capture: false }).steps).toEqual([]);
    expect(replayDialog(record.pairs, 17n, 31n, false).steps).toEqual([]);
  });

  it('names exhausted iteration budgets and padding overflow separately', () => {
    const exhausted = multiplyDialog(parameters.fieldPrime / 3n, 7n, { iterationFactor: -8 });
    expect(exhausted.passed).toBe(false);
    expect(exhausted.lower).not.toBe(0n);
    expect(exhausted.reason).toContain('Iteration budget exhausted');
    const adversarial = multiplyDialog(parameters.fieldPrime - 1n, 7n);
    expect(adversarial.passed).toBe(false);
    expect(adversarial.reason).toContain('Iteration budget exhausted');
    const overflow = multiplyDialog(15n, 7n, { prime: 31n, paddingFactor: 0 });
    expect(overflow.passed).toBe(false);
    expect(overflow.reason).toContain('Padding overflow');
  });

  it('does not call a mismatched output a pass', () => {
    expect(checkDialogResult(0n, 22n, 21n, 7n, 7n, null)).toBe(false);
    expect(checkDialogResult(1n, 21n, 21n, 7n, 7n, null)).toBe(false);
    expect(checkDialogResult(0n, 21n, 21n, 8n, 7n, null)).toBe(false);
    expect(checkDialogResult(0n, 21n, 21n, 7n, 7n, 'overflow')).toBe(false);
  });

  it('uses real iteration counts and a fixed whole-triplet budget', () => {
    expect(exactIterations(12n, 31n)).toBe(8);
    expect(bitLength(0n)).toBe(0);
    expect(bitLength(parameters.fieldPrime)).toBe(256);
    expect(dialogBudget(256, 2.4)).toBe(402);
    expect(dialogBudget(3, -8)).toBe(3);
  });

  it('parses strictly and rejects invalid model inputs', () => {
    expect(parseInteger(' 0xff ')).toBe(255n);
    expect(parseInteger('123')).toBe(123n);
    for (const value of ['', '-1', '1.5', '1e3', '0x', '9'.repeat(4097)]) expect(() => parseInteger(value)).toThrow();
    expect(() => recordEuclid(-1n)).toThrow();
    expect(() => recordEuclid(1n, { prime: 4n })).toThrow();
    expect(() => recordEuclid(1n, { paddingFactor: -1 })).toThrow();
    expect(() => recordEuclid(1n, { iterationFactor: NaN })).toThrow();
    expect(() => multiplyDialog(1n, -1n)).toThrow();
    expect(recordEuclid(3n, { prime: 9n }).reason).toContain('not coprime');
  });

  it('handles the x + y = p boundary instead of silently skipping it', () => {
    const prime = parameters.fieldPrime;
    const exactBoundary = pseudoMersenneReduce(prime);
    expect(exactBoundary.sumEqualsPrime).toBe(true);
    expect(exactBoundary.carry).toBe(0n);
    expect(exactBoundary.result).toBe(0n);
    for (const value of [0n, prime - 1n, prime, prime + 1n, 2n * prime - 2n]) {
      expect(pseudoMersenneReduce(value).result).toBe(value % prime);
    }
    expect(() => pseudoMersenneReduce(-1n)).toThrow();
    expect(() => pseudoMersenneReduce(2n * prime)).toThrow();
  });
});