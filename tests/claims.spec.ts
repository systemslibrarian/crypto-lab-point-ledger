import { describe, expect, it } from 'vitest';
import { attackResources, clockMinutes, onSpendProbability } from '../src/ledger';
import { ecdsaPoints, googleStatements, operatingPoints, parameters } from '../src/sources';

describe('Google claims, including clock erratum 2.1', () => {
  it('recomputes A1 and A2 for both statements', () => {
    googleStatements.forEach((statement, index) => {
      const result = attackResources(statement.toffoli, statement.qubits);
      expect(result.toffoli).toBe([81105024, 64305024][index]);
      expect(result.qubits).toBe([1191, 1441][index]);
      expect(result.toffoli).toBeLessThan(statement.attackBound);
      expect(result.qubits).toBeLessThan(statement.qubitBound);
      expect(result.additions).toBe(28);
    });
  });

  it('keeps headline and A1 clocks separate', () => {
    expect(clockMinutes(70000000)).toBeCloseTo(17.5, 10);
    expect(clockMinutes(90000000)).toBeCloseTo(22.5, 10);
    expect(clockMinutes(70000000, true)).toBeCloseTo(8.75, 10);
    expect(clockMinutes(90000000, true)).toBeCloseTo(11.25, 10);
    expect(clockMinutes(64305024)).toBeCloseTo(16.076256, 6);
    expect(clockMinutes(81105024)).toBeCloseTo(20.276256, 6);
    googleStatements.forEach((statement) => {
      expect(clockMinutes(attackResources(statement.toffoli, statement.qubits).toffoli)).not.toBe(clockMinutes(statement.attackBound));
    });
  });

  it('pins Figure 6 to nine minutes and reproduces four networks', () => {
    expect(parameters.raceMinutes).toBe(9);
    expect(onSpendProbability(parameters.raceMinutes, 10)).toBeCloseTo(0.4065696597, 10);
    expect(onSpendProbability(9, 2.5)).toBeCloseTo(0.0273237224, 10);
    expect(1 / onSpendProbability(9, 1.25)).toBeCloseTo(1339.43, 1);
    expect(1 / onSpendProbability(9, 1)).toBeCloseTo(8103.08, 1);
  });

  it('labels computed-clock races as distinct lab calculations', () => {
    expect(onSpendProbability(clockMinutes(70000000, true), 10)).toBeCloseTo(0.4169, 4);
    expect(onSpendProbability(clockMinutes(64305024, true), 10)).toBeCloseTo(0.4476, 4);
    expect(onSpendProbability(clockMinutes(81105024, true), 10)).toBeCloseTo(0.3628, 4);
  });

  it('recomputes the stated fuzz-test exponent', () => {
    expect(parameters.tests * Math.log2(1 - parameters.failureThreshold)).toBeCloseTo(-130.84, 2);
  });

  it('rejects invalid resource and timing inputs', () => {
    expect(() => attackResources(-1, 1)).toThrow(RangeError);
    expect(() => attackResources(1, NaN)).toThrow(RangeError);
    expect(() => onSpendProbability(-1, 10)).toThrow(RangeError);
    expect(() => onSpendProbability(9, 0)).toThrow(RangeError);
  });

  it('recomputes the ECDSA.Fail products, retry proxy and paper-baseline reduction', () => {
    expect(ecdsaPoints.cutoff.qubits * ecdsaPoints.cutoff.toffoli).toBe(1495670403);
    expect(ecdsaPoints.post.qubits * ecdsaPoints.post.toffoli).toBe(1258525947);
    const product = ecdsaPoints.windowed.qubits * ecdsaPoints.windowed.toffoli;
    expect(product).toBe(1956995082);
    expect(product / ecdsaPoints.windowed.success / 1e9).toBeCloseTo(1.961, 3);
    const baseline = ecdsaPoints.paperBaseline.qubits * ecdsaPoints.paperBaseline.toffoli;
    expect((1 - 1495670403 / baseline) * 100).toBeCloseTo(86.1, 1);
    expect(ecdsaPoints.readmeBaseline.qubits * ecdsaPoints.readmeBaseline.toffoli).toBe(10704574395);
    expect(baseline).not.toBe(10704574395);
  });

  it('derives the table reductions instead of repeating the abstract range', () => {
    expect((1 - 2 ** 21.19 / 2 ** 21.36) * 100).toBeCloseTo(11.1, 1);
    expect((1 - 2 ** 20.83 / 2 ** 21.00) * 100).toBeCloseTo(11.1, 1);
    const original = 28 * (2 ** 21.36 + 3 * 2 ** 16);
    const improved = 28 * (2 ** 21.19 + 3 * 2 ** 16);
    expect((1 - improved / original) * 100).toBeCloseTo(10.3590, 4);
    expect((1 - 2 ** 26.11 / 2 ** 26.27) * 100).toBeCloseTo(10.5, 1);
  });

  it('has every requested operating point and explicit accounting', () => {
    expect(operatingPoints).toHaveLength(11);
    expect(operatingPoints.filter(point => point.source === 'dialog')).toHaveLength(6);
    expect(operatingPoints.every(point => point.accounting && point.locator && point.correctness && point.interface)).toBe(true);
  });

  it('keeps the optional factory estimate on headline inputs', () => {
    expect(4 * 70000000 / (9 * 60)).toBeCloseTo(518518.52, 2);
    expect(500000 * 50000 * 1e-6).toBe(25000);
    expect(500000 * 50000 * 100e-6).toBe(2500000);
  });
});