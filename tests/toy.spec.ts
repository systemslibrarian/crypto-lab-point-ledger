import { describe, expect, it } from 'vitest';
import { applyToyCCX, toyRoundTrip } from '../src/kickmix-toy';

describe('Isolated classical CCX toy', () => {
  it('rejects operand aliasing by default', () => {
    expect(() => applyToyCCX(1, 1, [0, 0, 0])).toThrow('must be distinct');
    expect(toyRoundTrip(true, true).accepted).toBe(false);
  });

  it('exhibits the flaw only when the aliasing check is explicitly off', () => {
    const result = toyRoundTrip(true, false);
    expect(result.accepted).toBe(true);
    expect(result.reversible).toBe(false);
    expect(result.rows).toEqual([{ state: 0, forward: 0, reverse: 0 }, { state: 1, forward: 0, reverse: 0 }]);
  });

  it('round-trips a genuine distinct-operand CCX on every basis state', () => {
    const result = toyRoundTrip(false, true);
    expect(result.accepted).toBe(true);
    expect(result.reversible).toBe(true);
    expect(result.rows).toHaveLength(8);
    expect(applyToyCCX(3, 3, [0, 1, 2])).toBe(7);
  });

  it('rejects invalid widths, states and operands', () => {
    expect(() => applyToyCCX(0, 9, [0, 1, 2])).toThrow();
    expect(() => applyToyCCX(8, 3, [0, 1, 2])).toThrow();
    expect(() => applyToyCCX(0, 3, [-1, 1, 2])).toThrow();
  });
});