import { sha256 } from '@noble/hashes/sha2.js';
import { shake256 } from '@noble/hashes/sha3.js';
import { bytesToHex, concatBytes } from '@noble/hashes/utils.js';
import dialogSource from './dialog.ts?raw';
import { bitLength, multiplyDialog } from './dialog';
import { figureCodec, labDefaults, parameters } from './sources';

export type FuzzConfig = { prime: bigint; iterationFactor: number; paddingFactor: number };
export type SampleResult = { input: string; multiplicand: string; expected: string; actual: string; passed: boolean; reason: string | null };
export type FailureEstimate = { failures: number; samples: number; rate: number; lower: number; upper: number; method: 'rule of three' | 'Wilson'; mean: number; standardDeviation: number };

function positiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${label} must be a positive safe integer.`);
}

export function landabilityLog2(failureRate: number, tests: number) {
  positiveInteger(tests, 'Test count');
  if (!Number.isFinite(failureRate) || failureRate < 0 || failureRate > 1) throw new RangeError('Failure rate must be in [0, 1].');
  return tests * Math.log1p(-failureRate) / Math.LN2;
}

export function grindingBound(failureRate: number, tests: number, draws: number) {
  if (!Number.isFinite(draws) || draws < 1) throw new RangeError('Draw bound must be at least one.');
  return Math.min(1, 2 ** (Math.log2(draws) + landabilityLog2(failureRate, tests)));
}

export function failureCeiling(tests: number, draws: number, confidence: number) {
  positiveInteger(tests, 'Test count');
  if (!Number.isFinite(draws) || draws < 1 || !Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    throw new RangeError('Draws must be at least one; confidence must be strictly between zero and one.');
  }
  return -Math.expm1((Math.log1p(-confidence) - Math.log(draws)) / tests);
}

export function estimateFailures(failures: number, samples: number, iterations: readonly number[] = []): FailureEstimate {
  positiveInteger(samples, 'Sample count');
  if (!Number.isInteger(failures) || failures < 0 || failures > samples) throw new RangeError('Invalid failure count.');
  const rate = failures / samples;
  const squared = labDefaults.normal95 ** 2;
  const divisor = 1 + squared / samples;
  const center = (rate + squared / (2 * samples)) / divisor;
  const radius = labDefaults.normal95 * Math.sqrt(rate * (1 - rate) / samples + squared / (4 * samples ** 2)) / divisor;
  const mean = iterations.length ? iterations.reduce((total, count) => total + count, 0) / iterations.length : 0;
  const variance = iterations.length > 1 ? iterations.reduce((total, count) => total + (count - mean) ** 2, 0) / (iterations.length - 1) : 0;
  return {
    failures, samples, rate,
    lower: failures === 0 ? 0 : Math.max(0, center - radius),
    upper: failures === 0 ? Math.min(1, 3 / samples) : Math.min(1, center + radius),
    method: failures === 0 ? 'rule of three' : 'Wilson',
    mean,
    standardDeviation: Math.sqrt(variance),
  };
}

export function sampleField(readBytes: (length: number) => Uint8Array, prime: bigint) {
  if (prime < 3n) throw new RangeError('The field modulus must be at least three.');
  const bits = bitLength(prime);
  const byteCount = Math.ceil(bits / 8);
  const mask = 255 >>> (byteCount * 8 - bits);
  for (;;) {
    const bytes = readBytes(byteCount);
    if (bytes.length !== byteCount) throw new RangeError('The byte source returned an incorrect length.');
    bytes[0] &= mask;
    let value = 0n;
    for (const byte of bytes) value = (value << 8n) | BigInt(byte);
    if (value > 0n && value < prime) return value;
  }
}

export function randomField(prime: bigint) {
  return sampleField(length => crypto.getRandomValues(new Uint8Array(length)), prime);
}

export function committedBytes(config: FuzzConfig) {
  return new TextEncoder().encode(JSON.stringify({
    domain: 'Point Ledger classical dialog demo v1',
    implementation: dialogSource,
    prime: config.prime.toString(16),
    iterationFactor: config.iterationFactor,
    paddingFactor: config.paddingFactor,
    iterationMeanRatio: parameters.iterationMeanRatio,
    shrinkBitsPerStep: parameters.shrinkBitsPerStep,
    codec: figureCodec,
  }));
}

export function nonceBytes(nonce: bigint) {
  if (nonce < 0n || nonce >= 1n << BigInt(labDefaults.nonceBits)) throw new RangeError('Nonce must fit in 48 bits.');
  const bytes = new Uint8Array(labDefaults.nonceBits / 8);
  let remaining = nonce;
  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 255n);
    remaining >>= 8n;
  }
  return bytes;
}

export function seededFields(bytes: Uint8Array, prime: bigint) {
  const xof = shake256.create({ dkLen: 32 }).update(bytes);
  return () => sampleField(length => xof.xof(length), prime);
}

export function allSamplesPass(samples: readonly SampleResult[], requested: number) {
  return samples.length === requested && samples.every(sample => sample.passed);
}

export function runFuzzDraw(config: FuzzConfig, nonce: bigint, tests: number, earlyExit = true) {
  positiveInteger(tests, 'Demo test count');
  if (tests > labDefaults.maximumDemoTests) throw new RangeError(`Demo draws are limited to ${labDefaults.maximumDemoTests} tests.`);
  const bytes = concatBytes(committedBytes(config), nonceBytes(nonce));
  const commitment = bytesToHex(sha256(bytes));
  const nextField = seededFields(bytes, config.prime);
  const samples: SampleResult[] = [];
  for (let index = 0; index < tests; index += 1) {
    const input = nextField();
    const multiplicand = nextField();
    const result = multiplyDialog(input, multiplicand, { ...config, capture: false });
    samples.push({ input: input.toString(16), multiplicand: multiplicand.toString(16), expected: result.expected.toString(16), actual: result.replay.second.toString(16), passed: result.passed, reason: result.reason });
    if (earlyExit && !result.passed) break;
  }
  return { commitment, nonce: nonce.toString(), samples, landed: allSamplesPass(samples, tests), tests };
}

export function demonstrationInput(prime: bigint) {
  const digest = bytesToHex(sha256(new TextEncoder().encode(labDefaults.multiplierSeed)));
  return BigInt(`0x${digest}`) % (prime - 1n) + 1n;
}