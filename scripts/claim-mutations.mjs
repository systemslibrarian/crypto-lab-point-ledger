// Replay concrete faults against the assertion that owns each security or
// correctness claim. Every mutant must build, change dist/, die by assertion,
// restore byte-for-byte, and leave its owning test green again.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const build = [npmCommand, ['run', 'build']];
const vitest = (file, title) => [
  process.execPath,
  [join(root, 'node_modules', 'vitest', 'vitest.mjs'), 'run', file, '--testNamePattern', title],
];

function run([command, args]) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, CI: '1', NO_COLOR: '1' },
  });
}

function pass(command, label) {
  const result = run(command);
  if (result.status !== 0) {
    throw new Error(label + '\n' + result.stdout + '\n' + result.stderr);
  }
  return result;
}

function distHash() {
  const hash = createHash('sha256');
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const pathname = join(directory, entry.name);
      if (entry.isDirectory()) walk(pathname);
      else {
        hash.update(pathname);
        hash.update(readFileSync(pathname));
      }
    }
  };
  walk('dist');
  return hash.digest('hex');
}

const cases = [
  [
    'full-run accounting uses one extra point addition',
    'src/ledger.ts',
    '  const additions = 2 * parameters.fieldBits / parameters.window - 4;',
    '  const additions = 2 * parameters.fieldBits / parameters.window - 3;',
    vitest('tests/claims.spec.ts', 'recomputes A1 and A2 for both statements'),
  ],
  [
    'primed clock no longer halves the operation time',
    'src/ledger.ts',
    '  return toffoli * parameters.toffoliMicroseconds * 1e-6 * parameters.overhead / 60 * (primed ? parameters.primedFactor : 1);',
    '  return toffoli * parameters.toffoliMicroseconds * 1e-6 * parameters.overhead / 60;',
    vitest('tests/claims.spec.ts', 'keeps headline and A1 clocks separate'),
  ],
  [
    'exact-p reduction skips the equality boundary',
    'src/dialog.ts',
    '  const result = folded >= prime ? folded - prime : folded;',
    '  const result = folded > prime ? folded - prime : folded;',
    vitest('tests/dialog.spec.ts', 'handles the x + y = p boundary instead of silently skipping it'),
  ],
  [
    'dialog verdict ignores restoration of the input',
    'src/dialog.ts',
    '  return reason === null && first === 0n && product === expected && restored === input;',
    '  return reason === null && first === 0n && product === expected;',
    vitest('tests/dialog.spec.ts', 'does not call a mismatched output a pass'),
  ],
  [
    'field sampling accepts zero',
    'src/fuzz.ts',
    '    if (value > 0n && value < prime) return value;',
    '    if (value >= 0n && value < prime) return value;',
    vitest('tests/fuzz.spec.ts', 'rejects out-of-range and zero XOF values instead of reducing modulo p'),
  ],
  [
    'a truncated passing sample is allowed to land',
    'src/fuzz.ts',
    '  return samples.length === requested && samples.every(sample => sample.passed);',
    '  return samples.every(sample => sample.passed);',
    vitest('tests/fuzz.spec.ts', 'requires every requested sample before a draw lands'),
  ],
  [
    'draw-budget inversion uses the wrong logarithm sign',
    'src/fuzz.ts',
    '  return -Math.expm1((Math.log1p(-confidence) - Math.log(draws)) / tests);',
    '  return -Math.expm1((Math.log1p(-confidence) + Math.log(draws)) / tests);',
    vitest('tests/fuzz.spec.ts', 'recomputes the three 99% ceilings and the Google grinding exponent'),
  ],
  [
    'the fuzz worker accepts an arbitrary field modulus',
    'src/fuzz.ts',
    '  if (config.prime !== parameters.fieldPrime && config.prime !== parameters.smallField) {',
    '  if (false && config.prime !== parameters.fieldPrime && config.prime !== parameters.smallField) {',
    vitest('tests/fuzz.spec.ts', 'rejects unsupported or out-of-range fuzz configurations before sampling'),
  ],
  [
    'the toy accepts aliased CCX operands by default',
    'src/kickmix-toy.ts',
    '  if (checkAliasing && new Set(operands).size !== 3) throw new RangeError(' + "'Rejected: CCX operands must be distinct.'" + ');',
    '  if (false && checkAliasing && new Set(operands).size !== 3) throw new RangeError(' + "'Rejected: CCX operands must be distinct.'" + ');',
    vitest('tests/toy.spec.ts', 'rejects operand aliasing by default'),
  ],
  [
    'the commitment omits the dialog implementation bytes',
    'src/fuzz.ts',
    '    implementation: dialogSource,',
    "    implementation: '',",
    vitest('tests/fuzz.spec.ts', 'binds the implementation, parameters and nonce; seeds SHAKE with those same bytes'),
  ],
];

const sourceFiles = [...new Set(cases.map((entry) => entry[1]))];
const dirty = spawnSync('git', ['diff', '--exit-code', '--', ...sourceFiles], {
  cwd: root,
  encoding: 'utf8',
});
if (dirty.status !== 0) {
  throw new Error('Commit the source baseline before mutation checks.');
}

pass(build, 'baseline build');
const baseline = distHash();
const evidence = [];
console.log('baseline: unmutated copy PASSES');
mkdirSync('mutation-logs', { recursive: true });

for (const [name, file, before, after, owner] of cases) {
  pass(owner, name + ': baseline owner');
  const original = readFileSync(file, 'utf8');
  if (original.split(before).length !== 2) {
    throw new Error(name + ': expected exactly one mutation site');
  }

  let restoredBuild;
  let restoredHash;
  let restoredOwner;
  try {
    writeFileSync(file, original.replace(before, after));
    const sourceDiff = spawnSync('git', ['diff', '--', file], {
      cwd: root,
      encoding: 'utf8',
    }).stdout;
    if (!sourceDiff.trim()) throw new Error(name + ': source diff is empty');

    pass(build, name + ': mutant build');
    const mutant = distHash();
    if (mutant === baseline) throw new Error(name + ': production artifact did not move');

    const result = run(owner);
    const output = result.stdout + result.stderr;
    const logName = name.replaceAll(/[^A-Za-z0-9.-]+/g, '-').replace(/^-|-$/g, '');
    writeFileSync('mutation-logs/' + logName + '.log', output);
    if (
      result.status === 0 ||
      !/AssertionError|expected|FAIL|Test Files\s+\d+ failed/i.test(output)
    ) {
      throw new Error(name + ': no assertion kill\n' + output);
    }

    evidence.push({
      name,
      sourceDiff,
      baseline,
      mutant,
      namedTest: owner[1][owner[1].indexOf('--testNamePattern') + 1],
      assertionFailure: true,
      retries: 0,
    });
  } finally {
    writeFileSync(file, original);
    restoredBuild = run(build);
    if (restoredBuild.status === 0) restoredHash = distHash();
    restoredOwner = run(owner);
  }

  if (restoredBuild.status !== 0) {
    throw new Error(name + ': restore build failed\n' + restoredBuild.stdout + '\n' + restoredBuild.stderr);
  }
  if (restoredHash !== baseline) throw new Error(name + ': restored artifact hash differs');
  if (restoredOwner.status !== 0) {
    throw new Error(name + ': restored owner failed\n' + restoredOwner.stdout + '\n' + restoredOwner.stderr);
  }
  evidence.at(-1).restoredGreen = true;
  console.log(name + ': killed; exact artifact restored; owning test green');
}

writeFileSync('mutation-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
console.log('all ' + cases.length + ' mutation(s) caught');
