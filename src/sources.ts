export const parameters = {
  fieldBits: 256,
  window: 16,
  fieldPrime: (1n << 256n) - (1n << 32n) - 977n,
  fieldComplement: (1n << 32n) + 977n,
  smallField: (1n << 61n) - 1n,
  toffoliMicroseconds: 10,
  overhead: 1.5,
  primedFactor: 0.5,
  tests: 9024,
  confidence: 0.99,
  failureThreshold: 0.01,
  raceMinutes: 9,
  iterationFactor: 2.4,
  paddingFactor: 2.3,
  iterationMeanRatio: 1.413,
  shrinkBitsPerStep: Math.log2(8 / 3) / 2,
} as const;

export const parameterProvenance = {
  field: { source: 'Schrottenloher', locator: 'secp256k1 field; section 2', formula: 'p = 2^256 - 2^32 - 977; f = 2^32 + 977' },
  ledger: { source: 'Google', locator: 'Appendix A, equations A1-A2', formula: 'w = 16, n = 256, additions = 2n/w - 4' },
  clock: { source: 'Google', locator: 'Section II.B; brief erratum 2.1', formula: 'seconds = headline T * 10e-6 * 1.5; primed = seconds / 2; using A1 T instead is a lab derivation' },
  race: { source: 'Google', locator: 'Section III.B, Figure 6', formula: 'P = exp(-t_attack / T_block), with the paper\'s 9-minute example' },
  fuzz: { source: 'Google', locator: 'Appendix A.5-A.6', formula: 'N = 9024; failure threshold = 0.01' },
  dialog: { source: 'Schrottenloher', locator: 'Algorithm 4', formula: 'c_iter = 2.4; c_pad = 2.3' },
} as const;

export const googleStatements = [
  { id: 'google-1', name: 'Google / statement 1', qubits: 1175, toffoli: 2700000, attackBound: 90000000, qubitBound: 1200 },
  { id: 'google-2', name: 'Google / statement 2', qubits: 1425, toffoli: 2100000, attackBound: 70000000, qubitBound: 1450 },
] as const;

export const networks = [
  { name: 'Bitcoin', blockMinutes: 10, paperBound: 'slightly less than 41%' },
  { name: 'Litecoin', blockMinutes: 2.5, paperBound: 'less than 3%' },
  { name: 'Zcash', blockMinutes: 1.25, paperBound: 'less than 1 in 1,300' },
  { name: 'Dogecoin', blockMinutes: 1, paperBound: 'less than 1 in 8,000' },
] as const;

export const labScope = 'This lab is not a quantum circuit, not an attack, and not a submission tool. It uses classical BigInt arithmetic. No quantum simulation, ZK proof generation, real guest-code exploits, or benchmark submission tooling. Not production crypto - a teaching demo.';

export const figureCodec = [5, 4, 7, 1, 0, 3, 31, 6, 29, 17, 16, 19, 21, 20, 23, 27, 18, 25, 12, 13, 14, 8, 9, 10, 30, 15, 28] as const;
export const codecProvenance = {
  source: 'Schrottenloher, Figure 1',
  locator: 'https://arxiv.org/html/2606.02235v1/compressor.svg',
  formula: 'Input pairs ordered 00, 10, 11; triplet index = 9a + 3b + c. Output bits follow the top five wires; the sixth is zero.',
};

export const labDefaults = {
  multiplierSeed: 'point-ledger/demo/x',
  multiplicand: '123456789',
  sampleCount: 256,
  demoTests: 8,
  demoIterationFactor: 0.2,
  calibrationCount: 128,
  maxDraws: 512,
  maximumSamples: 10000,
  maximumDemoTests: 32,
  normal95: 1.959963984540054,
  workerProgressEvery: 16,
  drawBudgetMs: 500,
  nonceBits: 48,
  source: 'lab derivation',
  locator: 'Demo configuration, not external resource estimates',
  formula: 'Default x = SHA-256(multiplierSeed) reduced mod p; finite workload limits are lab choices; 95% Wilson z = inverse-normal(0.975).',
} as const;

export const references = {
  google: {
    label: 'Babbush et al.', title: 'Securing elliptic curve cryptocurrencies against quantum vulnerabilities',
    url: 'https://arxiv.org/abs/2603.28846v2', locator: '2603.28846v2; II.B, III.B / Fig. 6, Appendix A', kind: 'primary',
    status: 'Brief: I, II A-C, III A-B, Appendix A, IX, Acknowledgements read; IV-VIII headings only. Build checked Appendix A.2-A.7 and Fig. 6.',
  },
  dialog: {
    label: 'Schrottenloher', title: 'Optimized Point Addition Circuits for Elliptic Curve Discrete Logarithms',
    url: 'https://arxiv.org/abs/2606.02235v1', locator: '2606.02235v1; Algorithms 1-4, 7, 10-11; Fig. 1; Tables 1-3', kind: 'primary',
    status: 'Brief: read in full. Build read sections 1-5, all algorithms and tables; inspected Fig. 1 SVG.',
  },
  ecdsa: {
    label: 'Long et al. / ECDSA.Fail', title: 'ECDSA.Fail: Open Autoresearch for Quantum Cryptanalysis',
    url: 'https://arxiv.org/abs/2609.09582v1', locator: '2609.09582v1; 3.3, 5.1-5.2, Table 3, 6', kind: 'primary',
    status: 'Brief: abstract, 1-2 and 3.3 excerpt read; 3.3 in full, 4-6 and supplements not read. Build additionally read 3.3 and 6 in full, 5.1 and Table 3; not the full remaining paper.',
  },
  tob: {
    label: 'Keegan Ryan / Trail of Bits', title: "We beat Google's zero-knowledge proof of quantum cryptanalysis",
    url: 'https://blog.trailofbits.com/2026/04/17/we-beat-googles-zero-knowledge-proof-of-quantum-cryptanalysis/', locator: '17 Apr 2026; forged proof and two guest-program bugs', kind: 'primary',
    status: 'Brief: read in full. Build checked the original postmortem; no guest code executed.',
  },
  gidney: {
    label: 'Craig Gidney', title: 'The French have the Quantum Circuits',
    url: 'https://algassert.com/post/2602', locator: '1 Jun 2026, edited 2 Jun; The Problem with ZKPs', kind: 'primary',
    status: 'Brief and build: read in full. His DQI attribution does not name an arXiv identifier.',
  },
  challenge: {
    label: 'Layr-Labs / ecdsafail-challenge', title: 'Challenge README',
    url: 'https://github.com/Layr-Labs/ecdsafail-challenge', locator: 'README: benchmark, validity rules, reference numbers', kind: 'primary',
    status: 'Brief and build: README read; src/ not read. Initial baseline differs from the paper.',
  },
  khattar: {
    label: 'Khattar et al.', title: 'Verifiable quantum advantage via optimized DQI circuits',
    url: 'https://arxiv.org/abs/2510.10967', locator: 'Oct 2025; attribution via Schrottenloher ref. 14 and ECDSA.Fail 1.1', kind: 'primary',
    status: 'Brief: abstract only. Build uses the two papers for attribution; no implementation taken from this paper.',
  },
  critic: {
    label: 'abipalli', title: 'Breaking ECDSA, honestly',
    url: 'https://abipalli.github.io/investigations/ecdsa-fail', locator: '17 Jun 2026; nonce hunting, exactness claim and public-beacon proposal', kind: 'third-party, self-reported',
    status: 'Brief: read in full, not peer-reviewed. Build checked original writeup and the author\'s repository; reported circuit not reproduced here.',
  },
  sciam: {
    label: 'Scientific American', title: 'Secondary framing, not a numerical source',
    url: 'https://www.scientificamerican.com/', locator: '22 Sep 2026; see the brief\'s TRAPS section', kind: 'secondary',
    status: 'Brief: read in full. Not independently read in this build; no scientific claims or figures sourced from it.',
  },
  nist: {
    label: 'NIST', title: 'SHAKE256 and SHA-256 known-answer tests',
    url: 'https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program/secure-hashing', locator: 'SHAKE256LongMsg Len=2184; VariableOut COUNT=675; SHA-256 112-byte example', kind: 'primary',
    status: 'Three KATs executed; SHAKE absorbs and squeezes beyond one rate block.',
  },
} as const;
export type SourceKey = keyof typeof references;

export type OperatingPoint = {
  id: string; name: string; variant: string; qubits: number; toffoli: number; exponent?: number; bound?: boolean;
  correctness: string; interface: string; accounting: string; source: SourceKey; locator: string;
};

const schrottenloherRows = [
  { id: 'sch-google-space', name: 'Google, as tabulated', variant: 'Space / secp256k1', qubits: 1175, exponent: 21.36 },
  { id: 'sch-google-gate', name: 'Google, as tabulated', variant: 'Gates / secp256k1', qubits: 1425, exponent: 21.00 },
  { id: 'sch-space', name: 'Schrottenloher', variant: 'Space / secp256k1', qubits: 1192, exponent: 21.19 },
  { id: 'sch-gate', name: 'Schrottenloher', variant: 'Gates / secp256k1', qubits: 1446, exponent: 20.83 },
  { id: 'sch-generic-space', name: 'Schrottenloher', variant: 'Space / any prime', qubits: 1192, exponent: 21.78 },
  { id: 'sch-generic-gate', name: 'Schrottenloher', variant: 'Gates / any prime', qubits: 1446, exponent: 21.42 },
] as const;

export const ecdsaPoints = {
  cutoff: { qubits: 1151, toffoli: 1299453 },
  windowed: { qubits: 1162, toffoli: 1684161, success: 0.99809, cases: 100000 },
  post: { qubits: 1321, toffoli: 952707 },
  paperBaseline: { qubits: 2715, toffoli: 3960753 },
  readmeBaseline: { qubits: 2715, toffoli: 3942753 },
  criticBest: { qubits: 1168, toffoli: 1432332 },
  criticExact: { qubits: 2045, toffoli: 3200667 },
} as const;

export const operatingPoints: OperatingPoint[] = [
  ...googleStatements.map((statement, index) => ({
    ...statement, variant: index === 0 ? 'Low qubits' : 'Low gates', bound: true,
    correctness: 'All 9,024 circuit-dependent tests correct; >=99% rationale in A.5.',
    interface: 'Window-indexed point addition; lookup charged separately.',
    accounting: 'Average executed CCX + CCZ; upper thresholds; excludes lookup.', source: 'google' as const, locator: `Appendix A.${index + 1}, A.3-A.6`,
  })),
  ...schrottenloherRows.map(row => ({
    ...row, toffoli: 2 ** row.exponent,
    correctness: 'Table caption: failure <=2^-13.3; zero failures in 10,000 random runs.',
    interface: 'Windowed construction; add 16 qubits and 3*2^16 lookup operations.',
    accounting: 'CCX + CCZ + AND; rounded log2 count; excludes window overhead.', source: 'dialog' as const, locator: 'Table 1, including its two Google comparison rows',
  })),
  { id: 'ecdsa-cutoff', name: 'ECDSA.Fail', variant: 'Cutoff best / 26 Jul', ...ecdsaPoints.cutoff, correctness: '0/9,024 FS; 0.192% failure on 100,000 independent cases.', interface: 'Mixed addition; one addend supplied classically.', accounting: 'Average executed Toffoli; sampled support; not full-Shor accounting.', source: 'ecdsa', locator: '3.3, 5.1.1, Table 3' },
  { id: 'ecdsa-windowed', name: 'ECDSA.Fail', variant: 'Windowed-compatible', ...ecdsaPoints.windowed, correctness: 'p-hat = 0.99809 on 100,000 independent cases.', interface: 'Coherent window-indexed, single generic-affine call; not full Shor.', accounting: 'Average executed Toffoli; includes lookup/use/unlookup adaptation.', source: 'ecdsa', locator: '5.2.3, Table 3, 6' },
  { id: 'ecdsa-post', name: 'ECDSA.Fail', variant: 'Post-cutoff best', ...ecdsaPoints.post, correctness: '0/9,024 FS; independent success rate not stated.', interface: 'Mixed addition; coherent window support not demonstrated.', accounting: 'Average executed Toffoli; post-cutoff; not a hardware estimate.', source: 'ecdsa', locator: '5.3.3 and Table 3' },
];

export const additionSteps = [
  ['Flag', 'c = (i != 0)', 'other'], ['Lookup P', 'Load x1, y1', 'lookup'], ['Subtract x', 'x2 -= x1', 'other'],
  ['Subtract y', 'y2 -= y1', 'other'], ['Unlookup P', 'Erase x1, y1', 'lookup'], ['Divide', 'y2 *= inverse(x2)', 'multiply'],
  ['Lookup 3x', 'Load 3*x(Pi)', 'lookup'], ['Add 3x', 'x2 += 3*x(Pi)', 'other'], ['Unlookup 3x', 'Erase lookup', 'lookup'],
  ['Square', 'If c: x2 -= y2^2', 'square'], ['Multiply', 'y2 *= x2', 'multiply'], ['Negate', 'If c: x2 = -x2', 'other'],
  ['Lookup P', 'Load x1, y1', 'lookup'], ['Subtract y', 'y2 -= y1', 'other'], ['Add x', 'x2 += x1', 'other'],
  ['Unlookup P', 'Erase x1, y1', 'lookup'], ['Unflag', 'Uncompute c', 'other'],
] as const;

export const costShares = { multiplication: 90, reconstruction: 54, gcd: 36, square: 9, remaining: 1, source: 'Schrottenloher Table 3; remaining 1% is a lab derivation from rounded shares' } as const;

export const raceAssumptions = 'One signature; the public key reaches the attacker almost immediately; after derivation, a higher-fee forged transaction displaces the original; zero network congestion. The first assumptions favor the attacker; zero congestion favors the spender. Blocks follow the paper\'s Poisson model.';

export const derivations = {
  resources: 'T_total = (T_PA + 3*2^16)*(2*256/16 - 4); Q_total = Q_PA + 16.',
  exactClock: 'A1 total * 10 microseconds * 1.5 / 60; primed divides by 2. This is not the headline clock.',
  race: 'P(success) = exp(-attack minutes / mean block minutes). Computed-clock inputs are lab derivations.',
  ceiling: 'epsilon* = 1 - exp((ln(1-confidence) - ln G) / N). Conditional on a clean run, independent random-oracle draws, a bounded G, and a correct checker; not a posterior probability.',
  landability: 'P(clean draw) = (1-epsilon)^N; P(any clean draw) <= min(1, G*(1-epsilon)^N).',
  ecdsa: 'Q*T; retry proxy = Q*T / 0.99809; reduction = 1 - cutoff product / (2715*3960753).',
  compounding: 'Union bound for 28 calls: min(1, 28*(1-0.99809)); not an independence assertion or full-Shor simulation.',
  schrottenloher: 'Source reports 2^-13.3, approximately 1/10,000; zero-failure 95% rule-of-three = 3/10,000, approximately 2^-11.7.',
  tableReduction: 'Table 1: 1 - 2^21.19/2^21.36; Table 2 rounded totals: 1 - 2^26.11/2^26.27. Adding lookup to Table 1 instead gives 10.36%, not the same rounding path.',
  codec: 'Figure 1 table: 3^3 = 27 valid triplets fit in 2^5 = 32 words; one bit released. Round the iteration budget upward to a multiple of 3 in this lab.',
  measurement: 'Independent uniform nonzero field inputs; Wilson 95% interval for observed failures; if none, upper bound min(1,3/N). Mean and sample SD measured live.',
  factory: 'Headline 70M in the paper\'s rounded 9 minutes: 4*70M/(9*60) T states/s. Assuming 4 T/Toffoli (not stated by Google); 500,000*50,000*round_seconds gives 25,000 / 2,500,000 factory qubits.',
} as const;

export const proofFacts = { forgedToffoli: 0, forgedQubits: 1164, forgedOperations: 8300000, actualToffoli: 5980691, shardInstructions: 2 ** 22, nonceOperations: 96, source: 'Trail of Bits, 17 Apr; Google A.6; ECDSA.Fail 3.3' } as const;

export const timeline = [
  ['30 Mar', 'Google v1', 'google'], ['15 Apr', 'Google v2 / guest patch', 'google'], ['17 Apr', 'Trail of Bits postmortem', 'tob'],
  ['Late May', 'ECDSA.Fail launch', 'ecdsa'], ['1 Jun', 'Schrottenloher + Gidney', 'dialog'], ['17 Jun', 'abipalli writeup', 'critic'],
  ['26 Jul', 'ECDSA.Fail data cutoff', 'ecdsa'], ['9 Sep', 'ECDSA.Fail paper', 'ecdsa'],
] as const;

export const relatedLabs = {
  shor: 'https://systemslibrarian.github.io/crypto-lab-shor/',
  zk: 'https://systemslibrarian.github.io/crypto-lab-zk-proof-lab/',
  factor: 'https://systemslibrarian.github.io/crypto-lab-factor-forge/',
};

export const catalogMetadata = {
  category: 'POST-QUANTUM', categories: 16, chipSplit: '8 + 8', accent: '#35d6bb', favicon: 'receipt',
  status: 'Category verified against catalog CATEGORIES on 23 Sep 2026. Accent uses fleet fallback and favicon uses the brief proposal; central assignment and catalog card pending. Catalog not modified.',
};