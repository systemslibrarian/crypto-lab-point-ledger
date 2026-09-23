import { exactIterations, multiplyDialog } from './dialog';
import { estimateFailures, randomField, runFuzzDraw, type FailureEstimate, type FuzzConfig } from './fuzz';
import { labDefaults } from './sources';

export type WorkerRequest = { id: number; kind: 'measure' | 'grind'; config: FuzzConfig; count: number; maxDraws?: number };
export type Measurement = FailureEstimate & { elapsedMs: number; iterationCounts: number[] };
export type GrindHistory = { draw: number; checked: number; landed: boolean }[];
export type GrindResult = {
  calibration: Measurement;
  history: GrindHistory;
  draw: ReturnType<typeof runFuzzDraw>;
  draws: number;
  maxDrawMs: number;
  elapsedMs: number;
};
export type WorkerResponse =
  | { id: number; kind: 'progress'; completed: number; total: number; phase: string }
  | { id: number; kind: 'measure'; result: Measurement }
  | { id: number; kind: 'grind'; result: GrindResult }
  | { id: number; kind: 'error'; message: string };

function measure(request: WorkerRequest, count: number): Measurement {
  const started = performance.now();
  const iterationCounts: number[] = [];
  let failures = 0;
  for (let index = 0; index < count; index += 1) {
    const input = randomField(request.config.prime);
    const result = multiplyDialog(input, randomField(request.config.prime), { ...request.config, capture: false });
    if (!result.passed) failures += 1;
    iterationCounts.push(exactIterations(input, request.config.prime));
    if ((index + 1) % labDefaults.workerProgressEvery === 0) {
      postMessage({ id: request.id, kind: 'progress', completed: index + 1, total: count, phase: 'Measuring independent random inputs' } satisfies WorkerResponse);
    }
  }
  return { ...estimateFailures(failures, count, iterationCounts), elapsedMs: performance.now() - started, iterationCounts };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (!Number.isSafeInteger(request.count) || request.count < 1 || request.count > labDefaults.maximumSamples) throw new RangeError('Sample count is out of range.');
    if (request.kind === 'measure') {
      postMessage({ id: request.id, kind: 'measure', result: measure(request, request.count) } satisfies WorkerResponse);
      return;
    }
    const maxDraws = request.maxDraws ?? labDefaults.maxDraws;
    if (!Number.isSafeInteger(maxDraws) || maxDraws < 1 || maxDraws > labDefaults.maxDraws) throw new RangeError('Draw limit is out of range.');
    const started = performance.now();
    const calibration = measure(request, labDefaults.calibrationCount);
    const history: GrindHistory = [];
    let maxDrawMs = 0;
    let lastDraw: ReturnType<typeof runFuzzDraw> | undefined;
    for (let nonce = 0; nonce < maxDraws; nonce += 1) {
      const drawStart = performance.now();
      lastDraw = runFuzzDraw(request.config, BigInt(nonce), request.count);
      maxDrawMs = Math.max(maxDrawMs, performance.now() - drawStart);
      history.push({ draw: nonce + 1, checked: lastDraw.samples.length, landed: lastDraw.landed });
      if (lastDraw.landed) break;
      if ((nonce + 1) % labDefaults.workerProgressEvery === 0) {
        postMessage({ id: request.id, kind: 'progress', completed: nonce + 1, total: maxDraws, phase: 'Trying nonce draws' } satisfies WorkerResponse);
      }
    }
    postMessage({ id: request.id, kind: 'grind', result: { calibration, history, draw: lastDraw!, draws: history.length, maxDrawMs, elapsedMs: performance.now() - started } } satisfies WorkerResponse);
  } catch (error) {
    postMessage({ id: request.id, kind: 'error', message: error instanceof Error ? error.message : String(error) } satisfies WorkerResponse);
  }
};