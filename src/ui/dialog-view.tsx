import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, FlaskConical, Play, RotateCcw, Shuffle, SkipForward, Square } from 'lucide-react';
import { bitLength, encodeTriplet, multiplyDialog, parseInteger, pseudoMersenneReduce } from '../dialog';
import { demonstrationInput, randomField, type FailureEstimate } from '../fuzz';
import { labDefaults, parameters } from '../sources';
import { Cite, Derivation, integer, percent, SectionTitle, Status } from './shared';
import { useLabWorker } from './use-lab-worker';

export function FailureSummary({ estimate }: { estimate: FailureEstimate }) {
  return <div className="measurement-results" data-testid="failure-estimate"><div><span className="eyebrow">Observed failures</span><strong>{integer(estimate.failures)} / {integer(estimate.samples)}</strong></div><div><span className="eyebrow">{estimate.failures === 0 ? '95% upper bound / 3/N' : 'Measured failure rate'}</span><strong>{estimate.failures === 0 ? `<= ${percent(estimate.upper, 3)}` : percent(estimate.rate, 3)}</strong></div><p className="small muted">{estimate.failures === 0 ? 'No failures observed is not evidence of zero failure probability. Rule-of-three approximation, capped at 100%.' : `Wilson 95% interval: ${percent(estimate.lower)} to ${percent(estimate.upper)}.`}</p></div>;
}

function Register({ label, value, capacity, totalBits }: { label: string; value: bigint; capacity: number; totalBits: number }) {
  const needed = bitLength(value);
  return <div className="register"><div className="register-label"><span>{label}</span><span>{needed} bits needed / {capacity} available</span></div><div className="register-track"><div className={`register-allocated ${needed > capacity ? 'over-capacity' : ''}`} style={{ width: `${capacity / totalBits * 100}%` }}><span style={{ width: `${Math.min(1, needed / capacity) * 100}%` }} /></div></div>{needed > capacity && <span className="register-warning">Capacity exceeded; the drawn register is not expanded.</span>}</div>;
}

export function DialogView() {
  const [smallField, setSmallField] = useState(false);
  const prime = smallField ? parameters.smallField : parameters.fieldPrime;
  const [input, setInput] = useState(demonstrationInput(prime).toString());
  const [multiplicand, setMultiplicand] = useState<string>(labDefaults.multiplicand);
  const [iterationFactor, setIterationFactor] = useState<number>(parameters.iterationFactor);
  const [paddingFactor, setPaddingFactor] = useState<number>(parameters.paddingFactor);
  const [sampleCount, setSampleCount] = useState<number>(labDefaults.sampleCount);
  const [result, setResult] = useState<ReturnType<typeof multiplyDialog> | null>(null);
  const [phase, setPhase] = useState<'record' | 'replay'>('record');
  const [cursor, setCursor] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [boundary, setBoundary] = useState(false);
  const worker = useLabWorker();

  function retire() {
    if (result || error) setNotice('Result retired: inputs changed. Run the dialog again.');
    setResult(null);
    setError('');
    setCursor(0);
    setPhase('record');
    worker.retire();
  }
  function run() {
    try {
      const next = multiplyDialog(parseInteger(input), parseInteger(multiplicand), { prime, iterationFactor, paddingFactor });
      setResult(next);
      setPhase('record');
      setCursor(0);
      setNotice('');
      setError('');
    } catch (failure) {
      setResult(null);
      setNotice('');
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }
  const current = result?.steps[cursor];
  const replayStep = result?.replay.steps[Math.max(0, cursor - 1)];
  const bits = bitLength(prime);
  const recorded = result ? (phase === 'record' ? cursor : result.budget) : 0;
  const completeWords = Math.floor(recorded / 3);
  const transcript = result ? result.packed.slice(0, completeWords).map(word => word.toString(2).padStart(5, '0')).join('') + result.pairs.slice(completeWords * 3, recorded).map(pair => pair.join('')).join('') : '';
  const capacity = result ? result.packed.length * 5 : 0;
  const latestTriplet = result?.pairs.slice(Math.max(0, completeWords - 1) * 3, Math.max(0, completeWords - 1) * 3 + 3);
  const done = result !== null && phase === 'replay' && cursor === result.budget;
  const sum = boundary ? parameters.fieldPrime : 2n * parameters.fieldPrime - 2n;
  const reduction = pseudoMersenneReduce(sum);

  return <>
    <SectionTitle number="02" title="The dialog: record, then replay">Instead of calculating an inverse separately, remember the choices made while two numbers shrink. Read that record backward to turn multiplication into a sequence of small updates.</SectionTitle>
    <div className="source-row"><Cite source="dialog" locator="Algorithms 2-4; Fig. 1" /><span className="tag">Classical BigInt model</span></div>
    <div className="workbench">
      <div className="section-toolbar"><h3>In-place multiplication</h3><label className="check-label"><input type="checkbox" checked={smallField} onChange={event => { retire(); setSmallField(event.target.checked); setInput(demonstrationInput(event.target.checked ? parameters.smallField : parameters.fieldPrime).toString()); }} />Demo field: 2<sup>61</sup> &minus; 1</label></div>
      <div className="input-pair"><label className="field">Multiplier x<textarea aria-label="Multiplier x" rows={2} value={input} maxLength={4096} spellCheck={false} onChange={event => { if (event.target.value !== input) { retire(); setInput(event.target.value); } }} /></label><label className="field">Multiplicand y<textarea aria-label="Multiplicand y" rows={2} value={multiplicand} maxLength={4096} spellCheck={false} onChange={event => { if (event.target.value !== multiplicand) { retire(); setMultiplicand(event.target.value); } }} /></label></div>
      <div className="button-row"><button className="primary" onClick={run}><Play size={16} aria-hidden="true" />Run dialog</button><button onClick={() => { retire(); setInput(randomField(prime).toString()); }}><Shuffle size={16} aria-hidden="true" />Random x</button><span className="small muted">{smallField ? '61-bit demonstration field' : 'secp256k1 field, 256 bits'}</span></div>
      {notice && <Status testId="dialog-retired">{notice}</Status>}
      {error && <Status tone="fail" verdict="rejected" testId="dialog-error">{error}</Status>}
      {result && <>
        {result.wasReduced && <Status>Input x was at least p and has been reduced modulo p: {result.reduced.toString()}.</Status>}
        <div className="phase-strip"><span className={phase === 'record' ? 'current' : ''}>1 / Record Euclid</span><ArrowRight size={15} aria-hidden="true" /><span className={phase === 'replay' && !done ? 'current' : ''}>2 / Reverse replay</span><ArrowRight size={15} aria-hidden="true" /><span className={done ? 'current' : ''}>3 / Restore x</span></div>
        <div className="step-controls"><div className="button-row"><button title="Previous step" aria-label="Previous dialog step" disabled={cursor === 0} onClick={() => setCursor(cursor - 1)}><ChevronLeft size={18} aria-hidden="true" /></button><button title="Next step" aria-label="Next dialog step" disabled={cursor === result.budget} onClick={() => setCursor(cursor + 1)}><ChevronRight size={18} aria-hidden="true" /></button><button title="Finish this phase" aria-label="Finish dialog phase" disabled={cursor === result.budget} onClick={() => setCursor(result.budget)}><SkipForward size={18} aria-hidden="true" /></button><button title="Restart recording" aria-label="Restart dialog recording" onClick={() => { setPhase('record'); setCursor(0); }}><RotateCcw size={16} aria-hidden="true" /></button></div><span className="mono small" data-testid="dialog-position">{cursor} / {result.budget} steps</span></div>
        <label className="field sr-label">Dialog step<input type="range" aria-label="Dialog step" min={0} max={result.budget} step={1} value={cursor} onChange={event => setCursor(Number(event.target.value))} /></label>
        {phase === 'record' ? <><div className="registers"><Register label="u" value={current?.upper ?? result.upper} capacity={current?.width ?? 1} totalBits={bits} /><Register label="v" value={current?.lower ?? result.lower} capacity={current?.width ?? 1} totalBits={bits} /></div><div className="pair-readout"><span>Current choice (b0, b0 &amp; b1)</span><strong>{current ? `(${current.pair[0]}, ${current.pair[1]})` : 'record complete'}</strong></div><details><summary>Exact register values</summary><dl className="hex-list"><dt>u</dt><dd data-testid="dialog-u">{(current?.upper ?? result.upper).toString()}</dd><dt>v</dt><dd data-testid="dialog-v">{(current?.lower ?? result.lower).toString()}</dd></dl></details>{cursor === result.budget && <button className="primary" onClick={() => { setPhase('replay'); setCursor(0); }}><ArrowRight size={16} aria-hidden="true" />Replay backward</button>}</> : <><p className="formula">s = 2s mod p; if b0: s = s + r mod p; if b0 &amp; b1: swap(r, s)</p><div className="replay-values"><div><span className="eyebrow">r</span><code data-testid="replay-first">{cursor === 0 ? (parseInteger(multiplicand) % prime).toString() : replayStep?.first.toString()}</code></div><div><span className="eyebrow">s</span><code data-testid="replay-second">{cursor === 0 ? '0' : replayStep?.second.toString()}</code></div></div>{cursor > 0 && replayStep?.sumEqualsPrime && <Status tone="warn">This update hit r + s = p. Exact reduction gives zero; Algorithm 11 handles this boundary.</Status>}</>}
        <div className="transcript-heading"><span className="eyebrow">Fixed transcript register</span><span className="mono small">{transcript.length} / {capacity} bits filled</span></div><div className="transcript-grid" role="img" aria-label={`${transcript.length} of ${capacity} fixed transcript bits filled`} data-testid="transcript" data-capacity={capacity} data-filled={transcript.length}>{Array.from({ length: capacity }, (_, index) => <i key={index} className={index < transcript.length ? transcript[index] === '1' ? 'bit-one' : 'bit-zero' : ''} />)}</div>
        <p className="small muted">Each cell is one bit. Inactive capacity stays visible; overflow does not widen the register. This models register widths, not a quantum circuit or a qubit resource count.</p>
        {latestTriplet && <div className="codec-example"><div><span className="eyebrow">{completeWords ? 'Latest packed triplet' : 'First triplet preview'}</span><code>{latestTriplet.map(pair => `(${pair[0]},${pair[1]})`).join(' ')}</code></div><ArrowRight size={20} aria-hidden="true" /><div><span className="eyebrow">Figure 1 / 5 stored bits</span><code>{encodeTriplet(latestTriplet).toString(2).padStart(5, '0')} <span className="freed-bit">0 freed</span></code></div></div>}
        <Derivation name="codec" />
        {done && <><Status tone={result.passed ? 'pass' : 'fail'} verdict={result.passed ? 'pass' : 'failure'} testId="dialog-verdict"><strong>{result.passed ? 'PASS: replay matches independent BigInt multiplication.' : `FAILURE: ${result.reason}`}</strong></Status><div className="comparison"><div><span>Replay output s</span><code data-testid="dialog-output">{result.replay.second.toString()}</code></div><div><span>Native (x * y) mod p</span><code data-testid="dialog-expected">{result.expected.toString()}</code></div><div><span>Restored x</span><code data-testid="dialog-restored">{result.restored.toString()}</code></div></div></>}
      </>}
    </div>
    <div className="subsection"><h3><FlaskConical size={18} aria-hidden="true" />Break the budget</h3><p>Fewer iterations and less padding save room, but some inputs no longer fit. These measurements test the classical budget model, not the failure rate of any published quantum circuit.</p><div className="control-grid"><label className="field">Iteration margin c_iter <strong>{iterationFactor.toFixed(1)}</strong><input type="range" aria-label="Iteration margin" min={-2} max={4} step={0.1} value={iterationFactor} onChange={event => { const value = Number(event.target.value); if (value !== iterationFactor) { retire(); setIterationFactor(value); } }} /></label><label className="field">Padding margin c_pad <strong>{paddingFactor.toFixed(1)}</strong><input type="range" aria-label="Padding margin" min={0} max={4} step={0.1} value={paddingFactor} onChange={event => { const value = Number(event.target.value); if (value !== paddingFactor) { retire(); setPaddingFactor(value); } }} /></label><label className="field">Random inputs N<select aria-label="Measurement sample count" value={sampleCount} onChange={event => { const value = Number(event.target.value); if (value !== sampleCount) { worker.retire(); setSampleCount(value); } }}><option value={64}>64</option><option value={256}>256</option><option value={1024}>1,024</option><option value={10000}>10,000</option></select></label></div><div className="button-row"><button className="primary" disabled={worker.busy} onClick={() => worker.start({ kind: 'measure', config: { prime, iterationFactor, paddingFactor }, count: sampleCount })}><FlaskConical size={16} aria-hidden="true" />Measure random inputs</button>{worker.busy && <button onClick={() => worker.retire('Measurement cancelled; no completed result retained.')}><Square size={14} aria-hidden="true" />Cancel</button>}</div>
      {worker.busy && <Status>{worker.progress.phase}: {worker.progress.completed} / {worker.progress.total}<progress value={worker.progress.completed} max={worker.progress.total} aria-label="Measurement progress" /></Status>}
      {worker.notice && <Status>{worker.notice}</Status>}{worker.error && <Status tone="fail">{worker.error}</Status>}
      {worker.measurement && <><FailureSummary estimate={worker.measurement} /><div className="measured-stats"><span>Measured mean <strong data-testid="mean-iterations">{worker.measurement.mean.toFixed(2)}</strong> iterations</span><span>Measured sample SD <strong>{worker.measurement.standardDeviation.toFixed(2)}</strong></span><span>{worker.measurement.elapsedMs.toFixed(0)} ms in worker</span></div></>}
      <p className="small muted">The schedule uses ceil(1.413n + c_iter sqrt(n)), rounded up to a whole triplet. At step j, the width is capped at n and follows ceil(n - log2(8/3)j/2 + c_pad sqrt(n)). Measured counts above are not typed-in reference averages.</p><div className="source-row"><Cite source="dialog" locator="3.1 / iteration and register-sharing model" /><Derivation name="measurement" /></div>
    </div>
    <div className="subsection"><h3>Why a small constant replaces a large subtraction</h3><p>The field prime is just below a power of two: p = 2<sup>256</sup> &minus; f, where f = {parameters.fieldComplement.toString()}. A carry past bit 256 can fold back as an addition of f to the low bits.</p><div className="segmented" role="group" aria-label="Pseudo-Mersenne case"><button aria-pressed={!boundary} onClick={() => setBoundary(false)}>Overflow case</button><button aria-pressed={boundary} onClick={() => setBoundary(true)}>x + y = p boundary</button></div><dl className="hex-list"><dt>Sum</dt><dd>{sum.toString()}</dd><dt>Carry</dt><dd>{reduction.carry.toString()}</dd><dt>Low + carry * f</dt><dd>{reduction.folded.toString()}</dd><dt>Exact reduced result</dt><dd data-testid="reduction-result">{reduction.result.toString()}</dd></dl>{boundary && <Status tone="warn">The sum equals p without a 256-bit overflow. Checking only the carry misses it. The result must be zero; Algorithm 11 provides the extra early-reconstruction boundary handling.</Status>}<p className="small muted">This exhibit uses full-precision reduction. Algorithms 7 and 10 use truncated comparisons/carry propagation; their approximation errors are not simulated here.</p><Cite source="dialog" locator="Algorithms 7, 10 and 11" /></div>
    <p className="attribution">The record-and-replay idea was introduced by <Cite source="khattar" locator="2510.10967; attribution in Schrottenloher ref. 14" />. Schrottenloher supplies this codec; ECDSA.Fail builds on the idea <Cite source="ecdsa" locator="1.1" />.</p>
  </>;
}