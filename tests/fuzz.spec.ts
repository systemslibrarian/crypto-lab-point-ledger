import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { allSamplesPass, committedBytes, demonstrationInput, estimateFailures, failureCeiling, grindingBound, landabilityLog2, nonceBytes, randomField, runFuzzDraw, sampleField, seededFields, type FuzzConfig } from '../src/fuzz';
import { parameters } from '../src/sources';

const config: FuzzConfig = { prime: parameters.fieldPrime, iterationFactor: 2.4, paddingFactor: 2.3 };

describe('Fuzz evidence and deterministic draws', () => {
  it('recomputes the three 99% ceilings and the Google grinding exponent', () => {
    expect(failureCeiling(9024, 1, 0.99) * 100).toBeCloseTo(0.051, 3);
    expect(failureCeiling(9024, 1e8, 0.99) * 100).toBeCloseTo(0.255, 3);
    expect(failureCeiling(9024, 2 ** 48, 0.99) * 100).toBeCloseTo(0.419, 3);
    expect(landabilityLog2(0.01, 9024)).toBeCloseTo(-130.84, 2);
    expect(Math.log2(grindingBound(0.01, 9024, 2 ** 27))).toBeCloseTo(-103.84, 2);
  });

  it('satisfies the ceiling equation by an independent exponentiation', () => {
    for (const draws of [1, 1e8, 2 ** 48]) {
      const ceiling = failureCeiling(9024, draws, 0.99);
      expect(draws * (1 - ceiling) ** 9024).toBeCloseTo(0.01, 10);
    }
    expect(failureCeiling(102400, 1, 0.99)).toBeLessThan(failureCeiling(9024, 1, 0.99));
    expect(grindingBound(0, 1, 100)).toBe(1);
    expect(landabilityLog2(1, 3)).toBe(-Infinity);
  });

  it('shows a nonzero rule-of-three ceiling after zero observed failures', () => {
    const estimate = estimateFailures(0, 10000, [10, 12, 14]);
    expect(estimate.upper).toBe(0.0003);
    expect(estimate.lower).toBe(0);
    expect(estimate.method).toBe('rule of three');
    expect(estimate.mean).toBe(12);
    expect(estimate.standardDeviation).toBe(2);
    expect(estimateFailures(0, 1).upper).toBe(1);
  });

  it('computes Wilson intervals for nonzero failures including all-failed runs', () => {
    const estimate = estimateFailures(10, 100);
    expect(estimate.lower).toBeCloseTo(0.05523, 4);
    expect(estimate.upper).toBeCloseTo(0.17437, 4);
    expect(estimate.method).toBe('Wilson');
    expect(estimateFailures(100, 100).upper).toBe(1);
  });

  it('rejects out-of-range and zero XOF values instead of reducing modulo p', () => {
    const stream = [255, 0, 6];
    let reads = 0;
    expect(sampleField(() => Uint8Array.of(stream[reads++]), 7n)).toBe(6n);
    expect(reads).toBe(3);
    expect(() => sampleField(() => new Uint8Array(0), 7n)).toThrow('incorrect length');
    expect(() => sampleField(() => Uint8Array.of(1), 2n)).toThrow();
  });

  it('binds the implementation, parameters and nonce; seeds SHAKE with those same bytes', () => {
    const payload = committedBytes(config);
    const draw = runFuzzDraw(config, 0n, 4, false);
    const seed = Buffer.concat([payload, nonceBytes(0n)]);
    expect(draw.commitment).toBe(createHash('sha256').update(seed).digest('hex'));
    const independent = createHash('shake256', { outputLength: 32 }).update(seed).digest('hex');
    expect(draw.samples[0].input).toBe(BigInt(`0x${independent}`).toString(16));
    expect(runFuzzDraw(config, 0n, 4, false)).toEqual(draw);
    expect(runFuzzDraw(config, 1n, 4, false).commitment).not.toBe(draw.commitment);
    expect(committedBytes({ ...config, iterationFactor: 0.2 })).not.toEqual(payload);
  });

  it('returns independent field draws across the XOF rate boundary', () => {
    const next = seededFields(Uint8Array.of(1, 2, 3), parameters.fieldPrime);
    const values = Array.from({ length: 20 }, next);
    expect(new Set(values).size).toBe(20);
    expect(values.every(value => value > 0n && value < parameters.fieldPrime)).toBe(true);
    expect(randomField(parameters.smallField)).toBeGreaterThan(0n);
    expect(demonstrationInput(parameters.fieldPrime)).toBeLessThan(parameters.fieldPrime);
  });

  it('requires every requested sample before a draw lands', () => {
    const draw = runFuzzDraw(config, 0n, 4, false);
    expect(draw.landed).toBe(true);
    expect(allSamplesPass(draw.samples.slice(0, 3), 4)).toBe(false);
    expect(allSamplesPass([{ ...draw.samples[0], passed: false }], 1)).toBe(false);
    const broken = runFuzzDraw({ ...config, iterationFactor: -8 }, 0n, 4);
    expect(broken.landed).toBe(false);
    expect(broken.samples).toHaveLength(1);
    expect(broken.samples[0].reason).toContain('Iteration budget exhausted');
  });

  it('validates confidence, budgets, counters and nonce boundaries', () => {
    expect(nonceBytes((1n << 48n) - 1n)).toEqual(new Uint8Array(6).fill(255));
    for (const nonce of [-1n, 1n << 48n]) expect(() => nonceBytes(nonce)).toThrow();
    expect(() => runFuzzDraw(config, 0n, 33)).toThrow();
    expect(() => failureCeiling(0, 1, 0.99)).toThrow();
    expect(() => failureCeiling(1, 0, 0.99)).toThrow();
    expect(() => failureCeiling(1, 1, 1)).toThrow();
    expect(() => landabilityLog2(-0.1, 5)).toThrow();
    expect(() => landabilityLog2(NaN, 5)).toThrow();
    expect(() => grindingBound(0.1, 5, 0)).toThrow();
    expect(() => estimateFailures(2, 1)).toThrow();
  });
});