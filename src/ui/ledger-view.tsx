import { useState } from 'react';
import { ArrowDownRight, Clock3, Layers3 } from 'lucide-react';
import { attackResources, clockMinutes, onSpendProbability } from '../ledger';
import { additionSteps, costShares, googleStatements, networks, operatingPoints, parameters, raceAssumptions } from '../sources';
import { Cite, Derivation, integer, NumberFact, percent, SectionTitle } from './shared';

export function LedgerView() {
  const [statementIndex, setStatementIndex] = useState(1);
  const [primed, setPrimed] = useState(true);
  const [raceClock, setRaceClock] = useState('figure');
  const [costStep, setCostStep] = useState(5);
  const statement = googleStatements[statementIndex];
  const resources = attackResources(statement.toffoli, statement.qubits);
  const lowGate = attackResources(googleStatements[1].toffoli, googleStatements[1].qubits);
  const lowQubit = attackResources(googleStatements[0].toffoli, googleStatements[0].qubits);
  const raceTimes: Record<string, number> = {
    figure: parameters.raceMinutes,
    headline: clockMinutes(googleStatements[1].attackBound, true),
    'a1-gate': clockMinutes(lowGate.toffoli, true),
    'a1-qubit': clockMinutes(lowQubit.toffoli, true),
  };
  const attackTime = raceTimes[raceClock];

  return <>
    <SectionTitle number="01" title="The ledger and the clock">A quantum attack is a long sequence of arithmetic. Start with one point addition, then account for the whole run.</SectionTitle>
    <div className="section-toolbar"><div className="eyebrow"><Layers3 size={15} aria-hidden="true" />Google's two operating points</div><div className="segmented" role="group" aria-label="Google resource statement">
      <button aria-pressed={statementIndex === 1} onClick={() => setStatementIndex(1)}>Low gates</button>
      <button aria-pressed={statementIndex === 0} onClick={() => setStatementIndex(0)}>Low qubits</button>
    </div></div>
    <div className="metrics-row">
      <NumberFact label="Non-Clifford operations / full run" value={integer(resources.toffoli)} testId="attack-toffoli" detail={<>A1 on ZK bounds <span className="tag">lab derivation</span></>} />
      <NumberFact label="Logical qubits / full run" value={integer(resources.qubits)} testId="attack-qubits" detail={<>A2: {integer(statement.qubits)} + {parameters.window} <span className="tag">lab derivation</span></>} />
      <NumberFact label="Windowed point additions" value={resources.additions} testId="addition-count" detail={<>Window {parameters.window}; field {parameters.fieldBits} bits</>} />
    </div>
    <div className="ledger-equation"><span data-testid="addition-toffoli">{integer(statement.toffoli)}</span><span>+</span><span data-testid="lookup-toffoli">{integer(resources.lookupPerAddition)}</span><span>per addition</span><span className="equation-times">&times; {resources.additions}</span></div>
    <figure className="cost-figure">
      <div className="addition-bars" aria-label={`${resources.additions} equal additions, each ${integer(statement.toffoli)} arithmetic operations and ${integer(resources.lookupPerAddition)} lookup operations`} role="img">
        {Array.from({ length: resources.additions }, (_, index) => <div className="addition-bar" key={index} data-testid="addition-bar"><div className="arithmetic-fill" style={{ height: `${statement.toffoli / (statement.toffoli + resources.lookupPerAddition) * 100}%` }} /><div className="lookup-fill" style={{ height: `${resources.lookupPerAddition / (statement.toffoli + resources.lookupPerAddition) * 100}%` }} /><span>{index + 1}</span></div>)}
      </div>
      <figcaption><span><i className="swatch arithmetic-fill" />Arithmetic <strong data-testid="arithmetic-total">{integer(resources.arithmeticTotal)}</strong></span><span><i className="swatch lookup-fill" />Lookup <strong data-testid="lookup-total">{integer(resources.lookupTotal)}</strong></span><span className="muted">Equal additions, not a time trace</span></figcaption>
    </figure>
    <p className="small muted">Here T counts non-Clifford operations, not T gates. Q counts logical qubits, not physical hardware. Small Fourier-transform and unlookup costs are omitted in the source's approximation.</p>
    <div className="source-row"><Cite source="google" locator="Appendix A.3 / A1-A3" /><Derivation name="resources" /></div>

    <details className="wide-disclosure" id="operating-points"><summary>Operating-point ledger <span className="count-label">{operatingPoints.length} source rows</span></summary>
      <p className="small muted">These are reported arithmetic operating points, not interchangeable hardware estimates. The two Google rows inside Schrottenloher's table are reproduced separately from Google's ZK thresholds.</p>
      <div className="table-scroll" role="region" aria-label="Operating-point ledger" tabIndex={0}><table className="operating-table"><thead><tr><th scope="col">Source</th><th scope="col">Q / logical</th><th scope="col">T / per addition</th><th scope="col">Correctness as stated</th><th scope="col">Interface as stated</th></tr></thead><tbody>
        {operatingPoints.map(point => <tr key={point.id} data-source={point.source}><th scope="row"><strong>{point.name}</strong><span>{point.variant}</span><span className="accounting-tag">{point.accounting}</span><Cite source={point.source} locator={point.locator} /></th><td className="numeric">{point.bound ? '<= ' : ''}{integer(point.qubits)}</td><td className="numeric">{point.bound ? '<= ' : ''}{point.exponent !== undefined ? <>2<sup>{point.exponent.toFixed(2)}</sup><small>approximately {integer(point.toffoli)}</small></> : integer(point.toffoli)}</td><td>{point.correctness || 'not stated'}</td><td>{point.interface || 'not stated'}</td></tr>)}
      </tbody></table></div>
      <p className="caveat">ECDSA.Fail calls the comparison contextual: one addend may be classical, failure definitions differ, and average executed gates depend on the selected support. Its windowed variant is a single-call construction on a restricted generic-affine domain, not a complete Shor implementation.</p>
      <Derivation name="tableReduction" label="why the table percentages differ" />
    </details>

    <div className="subsection two-column">
      <div><div className="subheading"><h3><Clock3 size={18} aria-hidden="true" />Two inputs. Two clocks.</h3><label className="check-label"><input type="checkbox" checked={primed} onChange={event => setPrimed(event.target.checked)} />Primed start</label></div>
        <p className="small muted">A primed machine performs half the work before the key is known. It is a model assumption, not a measured machine.</p>
        <div className="table-scroll" role="region" aria-label="Clock calculations" tabIndex={0}><table className="clock-table"><thead><tr><th scope="col">Clock input</th><th scope="col">Low gates</th><th scope="col">Low qubits</th></tr></thead><tbody>
          <tr><th scope="row">Headline bounds<small>{integer(googleStatements[1].attackBound)} / {integer(googleStatements[0].attackBound)}<br />Google II.B</small></th><td><strong data-testid="headline-gate-minutes">{clockMinutes(googleStatements[1].attackBound, primed).toFixed(2)}</strong> min</td><td><strong data-testid="headline-qubit-minutes">{clockMinutes(googleStatements[0].attackBound, primed).toFixed(2)}</strong> min</td></tr>
          <tr><th scope="row">A1 on ZK bounds<small>{integer(lowGate.toffoli)} / {integer(lowQubit.toffoli)}<br /><span className="tag">lab derivation</span></small></th><td><strong data-testid="a1-gate-minutes">{clockMinutes(lowGate.toffoli, primed).toFixed(4)}</strong> min</td><td><strong data-testid="a1-qubit-minutes">{clockMinutes(lowQubit.toffoli, primed).toFixed(4)}</strong> min</td></tr>
        </tbody></table></div>
        <p className="formula">t = T<sub>input</sub> &times; {parameters.toffoliMicroseconds} &micro;s &times; {parameters.overhead}{primed ? ' / 2' : ''}</p>
        <div className="source-row"><Cite source="google" locator="II.B; erratum 2.1 separates A1" /><Derivation name="exactClock" /></div>
      </div>
      <div><h3>The on-spend race</h3><label className="field">Attack-time input<select value={raceClock} onChange={event => setRaceClock(event.target.value)} aria-label="Race clock input"><option value="figure">Figure 6: Google's stated 9 minutes</option><option value="headline">Headline low-gate, primed</option><option value="a1-gate">A1 low-gate, primed</option><option value="a1-qubit">A1 low-qubit, primed</option></select></label>
        <div className="race-input"><span data-testid="race-time">{attackTime.toFixed(4)}</span> min <span className="tag" data-testid="race-attribution">{raceClock === 'figure' ? 'Google Fig. 6 input' : 'lab derivation'}</span></div>
        <p className="formula">P(success) = exp(&minus;t<sub>attack</sub> / T<sub>block</sub>)</p>
        <div className="race-list">{networks.map(network => { const probability = onSpendProbability(attackTime, network.blockMinutes); return <div className="race-row" key={network.name}><div><strong>{network.name}</strong><small>{network.blockMinutes} min / block</small></div><div className="race-track" aria-hidden="true"><span style={{ width: `${probability * 100}%` }} /></div><div className="race-result"><strong data-testid={`race-${network.name.toLowerCase()}`}>{probability.toFixed(4)}</strong><small>{raceClock === 'figure' ? network.paperBound : percent(probability, 2)}</small></div></div>; })}</div>
        <p className="caption-assumptions">{raceAssumptions}</p><Cite source="google" locator="III.B / Figure 6 caption" />
      </div>
    </div>

    <div className="subsection"><h3>Where the cost lives</h3><p className="small muted">One addition, {additionSteps.length} operations in Algorithm 1. Multiplication and its inverse do most of the work.</p>
      <div className="step-strip" role="group" aria-label="Point-addition operations">{additionSteps.map((step, index) => <button key={index} className={`step-${step[2]}`} aria-pressed={costStep === index} title={`${index + 1}. ${step[0]}: ${step[1]}`} aria-label={`Step ${index + 1}: ${step[0]}`} onClick={() => setCostStep(index)}>{index + 1}</button>)}</div>
      <div className="step-description" role="status"><span>STEP {costStep + 1}</span><strong>{additionSteps[costStep][0]}</strong><code>{additionSteps[costStep][1]}</code></div>
      <details className="wide-disclosure"><summary><ArrowDownRight size={16} aria-hidden="true" />Reveal the reported cost shares</summary><div className="share-chart" role="img" aria-label={`${costShares.multiplication}% for multiplication and inverse, ${costShares.square}% squaring, about ${costShares.remaining}% other`}><div style={{ width: `${costShares.reconstruction}%` }}>Reconstruction {costShares.reconstruction}%</div><div style={{ width: `${costShares.gcd}%` }}>GCD {costShares.gcd}%</div><div style={{ width: `${costShares.square}%` }} title={`Squaring ${costShares.square}%`}>{costShares.square}%</div><div style={{ width: `${costShares.remaining}%` }} title="Remainder, rounded" /></div><p>Two in-place multiplications account for about <strong>{costShares.multiplication}%</strong> of the cost. Reconstruction and GCD are parts of that same share, not extra costs.</p><Cite source="dialog" locator="Algorithm 1; Table 3, space-optimized secp256k1 column" /><p className="small muted">Table percentages are rounded. The small remainder is a lab derivation, not a separately reported component.</p></details>
    </div>
    <details className="wide-disclosure"><summary>Optional: the magic-state factory estimate</summary><p>Using the headline {integer(googleStatements[1].attackBound)} operations in the paper's stated {parameters.raceMinutes} minutes, and assuming four T states per Toffoli, gives {integer(4 * googleStatements[1].attackBound / (parameters.raceMinutes * 60))} T states per second. Google does not state that four-to-one conversion.</p><p>Using its rounded half-million rate and 50,000 qubit-rounds per T state gives 25,000 factory qubits at a 1 &micro;s round or 2,500,000 at 100 &micro;s.</p><Derivation name="factory" /><Cite source="google" locator="II.B; factory calculation is a lab derivation" /></details>
  </>;
}