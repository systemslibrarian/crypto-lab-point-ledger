import { Check, CircleAlert, ExternalLink, Info, Sigma } from 'lucide-react';
import type { ReactNode } from 'react';
import { derivations, references, type SourceKey } from '../sources';

export const integer = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 0 });
export const percent = (value: number, digits = 3) => `${(value * 100).toFixed(digits)}%`;

export function Cite({ source, locator }: { source: SourceKey; locator?: string }) {
  const citation = references[source];
  return <a className="citation" href={citation.url} target="_blank" rel="noreferrer" title={locator ?? citation.locator}>{citation.label} <span>{locator ?? citation.locator}</span><ExternalLink size={12} aria-hidden="true" /></a>;
}

export function Derivation({ name, label }: { name: keyof typeof derivations; label?: string }) {
  return <details className="derivation"><summary><Sigma size={14} aria-hidden="true" />Lab derivation{label ? ` / ${label}` : ''}</summary><p>{derivations[name]}</p></details>;
}

export function SectionTitle({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <div className="section-heading"><span className="act-number" aria-hidden="true">{number}</span><div><h2>{title}</h2><p>{children}</p></div></div>;
}

export function Status({ tone = 'neutral', children, verdict, testId }: { tone?: 'neutral' | 'pass' | 'fail' | 'warn'; children: ReactNode; verdict?: string; testId?: string }) {
  const Icon = tone === 'pass' ? Check : tone === 'fail' || tone === 'warn' ? CircleAlert : Info;
  return <div className={`status status-${tone}`} role="status" aria-live="polite" data-verdict={verdict} data-testid={testId}><Icon size={18} aria-hidden="true" /><div>{children}</div></div>;
}

export function NumberFact({ label, value, detail, testId }: { label: string; value: ReactNode; detail: ReactNode; testId?: string }) {
  return <div className="number-fact"><div className="eyebrow">{label}</div><div className="fact-value" data-testid={testId}>{value}</div><div className="fact-detail">{detail}</div></div>;
}