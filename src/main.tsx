import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { BookOpen, Github, Menu } from 'lucide-react';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import './styles.css';
import { catalogMetadata, labScope, references, relatedLabs } from './sources';
import { LedgerView } from './ui/ledger-view';
import { DialogView } from './ui/dialog-view';
import { FuzzView } from './ui/fuzz-view';
import { ProofView } from './ui/proof-view';

function Topbar() {
  return <><a className="cl-skip-link" href="#app">Skip to content</a><header className="cl-topbar" role="banner" aria-label="Crypto Lab"><a className="cl-brand" href="https://crypto-lab.systemslibrarian.dev/" aria-label="Crypto Lab home"><span className="cl-badge">CL</span><span className="cl-brand-text"><span className="cl-title">CRYPTO LAB</span><span className="cl-sub">systemslibrarian.dev</span></span></a><nav className="cl-actions" aria-label="Crypto Lab navigation"><a className="cl-btn" href="https://crypto-lab.systemslibrarian.dev/" aria-label="Crypto Lab menu"><Menu size={15} aria-hidden="true" /><span>Menu</span></a><a className="cl-btn" href="https://github.com/systemslibrarian/crypto-lab-point-ledger" target="_blank" rel="noreferrer" aria-label="View this project on GitHub"><Github size={15} aria-hidden="true" /><span>GitHub</span></a></nav></header></>;
}

function App() {
  const [activeAct, setActiveAct] = useState(0);
  const acts = ['The ledger', 'The dialog', 'The test set', 'The proof'];
  return <div className="page-content">
    <div className="cl-hero"><div className="cl-hero-main"><p className="eyebrow">POST-QUANTUM / RESOURCE ESTIMATES</p><h1 className="cl-hero-title">Point Ledger</h1><p className="cl-hero-sub">secp256k1 Shor resource estimates<br /><span>arXiv 2603.28846v2 &middot; 2606.02235v1 &middot; 2609.09582v1</span></p><p className="cl-hero-desc">What it costs to break Bitcoin's curve, where that cost lives, and what a zero-knowledge proof of the cost actually proves.</p><p className="hero-related"><a href={relatedLabs.shor}>Shor: the algorithm</a><span>/</span>This lab: its cost ledger</p></div><aside className="cl-hero-why" aria-label="Why it matters"><span className="eyebrow">WHY IT MATTERS</span><p>Google's model gives a primed, fast-clock machine <strong>about nine minutes per key</strong>, against Bitcoin's ten-minute average block. Trust in that estimate depends on what its proof actually checked.</p><a className="citation" href={references.google.url}>Google II.B and Fig. 6: stated assumption</a></aside></div>
    <nav className="act-navigation" aria-label="Four-act sequence"><div className="act-tabs" role="tablist" aria-label="Point Ledger acts">{acts.map((act, index) => <button key={act} id={`tab-${index}`} role="tab" aria-controls={`act-${index}`} aria-selected={activeAct === index} tabIndex={activeAct === index ? 0 : -1} onClick={() => setActiveAct(index)} onKeyDown={event => { const next = event.key === 'ArrowRight' ? (index + 1) % acts.length : event.key === 'ArrowLeft' ? (index + acts.length - 1) % acts.length : event.key === 'Home' ? 0 : event.key === 'End' ? acts.length - 1 : null; if (next !== null) { event.preventDefault(); setActiveAct(next); document.getElementById(`tab-${next}`)?.focus(); } }}><span>0{index + 1}</span>{act}</button>)}</div></nav>
    <section id="act-0" role="tabpanel" aria-labelledby="tab-0" hidden={activeAct !== 0}><LedgerView /></section>
    <section id="act-1" role="tabpanel" aria-labelledby="tab-1" hidden={activeAct !== 1}><DialogView /></section>
    <section id="act-2" role="tabpanel" aria-labelledby="tab-2" hidden={activeAct !== 2}><FuzzView /></section>
    <section id="act-3" role="tabpanel" aria-labelledby="tab-3" hidden={activeAct !== 3}><ProofView /></section>
    <div className="act-footer"><span className="small muted">ACT {activeAct + 1} OF {acts.length}</span>{activeAct < acts.length - 1 && <button onClick={() => { setActiveAct(activeAct + 1); document.getElementById(`tab-${activeAct + 1}`)?.focus(); }}>Continue to {acts[activeAct + 1].toLowerCase()}</button>}</div>
    <details className="wide-disclosure" id="sources"><summary>Sources, read status and scope</summary><p className="small muted">Read status distinguishes the supplied brief from verification during this build. External resource counts are sourced; live calculations and demo parameters are lab derivations.</p><div className="source-register">{Object.entries(references).map(([key, source]) => <article key={key}><h3><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a><span className="tag">{source.kind}</span></h3><p>{source.title}</p><p className="small muted">{source.locator}</p><p className="small muted">{source.status}</p></article>)}</div><p className="small muted">Catalog category: {catalogMetadata.category}. {catalogMetadata.categories} existing categories; chip split {catalogMetadata.chipSplit}. {catalogMetadata.status}</p><p><a href={relatedLabs.factor}>Factor Forge: the classical-baseline sibling</a></p><p className="small muted">The brief's TRAPS distinguish physical from logical qubits, per-addition from full-run counts, and source statements from lab derivations. Scientific American is listed for framing only.</p></details>
    <div className="scope-note"><BookOpen size={19} aria-hidden="true" /><p>{labScope}</p></div>
    <footer className="scripture-footer"><p>So whether you eat or drink or whatever you do, do it all for the glory of God. &#8212; 1 Corinthians 10:31</p></footer>
  </div>;
}

createRoot(document.getElementById('chrome')!).render(<Topbar />);
createRoot(document.getElementById('app')!).render(<App />);