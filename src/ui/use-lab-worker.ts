import { useEffect, useRef, useState } from 'react';
import type { GrindResult, Measurement, WorkerRequest, WorkerResponse } from '../lab.worker';

export function useLabWorker() {
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 1, phase: '' });
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [grind, setGrind] = useState<GrindResult | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => () => worker.current?.terminate(), []);

  function retire(message = 'Result retired: inputs changed. Run again for these parameters.') {
    worker.current?.terminate();
    worker.current = null;
    sequence.current += 1;
    if (busy || measurement || grind || error) setNotice(message);
    setBusy(false);
    setMeasurement(null);
    setGrind(null);
    setError('');
  }

  function start(request: Omit<WorkerRequest, 'id'>) {
    worker.current?.terminate();
    const id = ++sequence.current;
    setBusy(true);
    setMeasurement(null);
    setGrind(null);
    setError('');
    setNotice('');
    setProgress({ completed: 0, total: request.count, phase: 'Starting worker' });
    try {
      const activeWorker = new Worker(new URL('../lab.worker.ts', import.meta.url), { type: 'module' });
      worker.current = activeWorker;
      activeWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        if (response.id !== sequence.current) return;
        if (response.kind === 'progress') {
          setProgress(response);
          return;
        }
        setBusy(false);
        if (response.kind === 'measure') setMeasurement(response.result);
        if (response.kind === 'grind') setGrind(response.result);
        if (response.kind === 'error') setError(response.message);
        activeWorker.terminate();
        worker.current = null;
      };
      activeWorker.onerror = event => {
        if (id !== sequence.current) return;
        setError(`Worker failed: ${event.message || 'arithmetic run did not complete'}`);
        setBusy(false);
        activeWorker.terminate();
        worker.current = null;
      };
      activeWorker.postMessage({ ...request, id });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      setBusy(false);
    }
  }
  return { busy, progress, measurement, grind, notice, error, start, retire };
}