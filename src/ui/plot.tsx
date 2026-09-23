import { useEffect, useRef } from 'react';

export type PlotSeries = { name: string; color: string; points: readonly (readonly [number, number])[] };

export function LogPlot({ series, xLabel, yLabel, description, testId }: { series: PlotSeries[]; xLabel: string; yLabel: string; description: string; testId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    function draw() {
      if (!element || element.clientWidth === 0) return;
      const width = element.clientWidth;
      const height = 235;
      const scale = window.devicePixelRatio || 1;
      element.width = width * scale;
      element.height = height * scale;
      const context = element.getContext('2d');
      if (!context) return;
      context.scale(scale, scale);
      context.fillStyle = '#171e1c';
      context.fillRect(0, 0, width, height);
      const points = series.flatMap(line => line.points).filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1]) && point[1] > 0);
      if (!points.length) return;
      const left = 61;
      const right = width - 19;
      const top = 20;
      const bottom = height - 44;
      const minX = Math.min(0, ...points.map(point => point[0]));
      const maxX = Math.max(1, ...points.map(point => point[0]));
      const minLog = Math.floor(Math.log10(Math.min(...points.map(point => point[1]))));
      const maxLog = Math.max(minLog + 1, Math.ceil(Math.log10(Math.max(...points.map(point => point[1])))));
      const projectX = (value: number) => left + (value - minX) / (maxX - minX) * (right - left);
      const projectY = (value: number) => bottom - (Math.log10(value) - minLog) / (maxLog - minLog) * (bottom - top);
      context.font = '11px "IBM Plex Mono", monospace';
      context.lineWidth = 1;
      for (let tick = 0; tick <= 4; tick += 1) {
        const exponent = minLog + (maxLog - minLog) * tick / 4;
        const vertical = bottom - (bottom - top) * tick / 4;
        context.strokeStyle = '#42514d';
        context.beginPath(); context.moveTo(left, vertical); context.lineTo(right, vertical); context.stroke();
        context.fillStyle = '#b8c7c1';
        context.textAlign = 'right';
        context.fillText(`10^${Number(exponent.toFixed(1))}`, left - 9, vertical + 4);
        const horizontalValue = minX + (maxX - minX) * tick / 4;
        context.textAlign = 'center';
        context.fillText(Number(horizontalValue.toFixed(1)).toLocaleString('en-US'), projectX(horizontalValue), bottom + 20);
      }
      for (const line of series) {
        context.strokeStyle = line.color;
        context.fillStyle = line.color;
        context.lineWidth = 2;
        context.beginPath();
        let started = false;
        for (const [horizontal, vertical] of line.points) {
          if (!(vertical > 0) || !Number.isFinite(vertical)) continue;
          if (!started) { context.moveTo(projectX(horizontal), projectY(vertical)); started = true; }
          else context.lineTo(projectX(horizontal), projectY(vertical));
        }
        context.stroke();
        if (line.points.length < 20) for (const [horizontal, vertical] of line.points) {
          if (!(vertical > 0) || !Number.isFinite(vertical)) continue;
          context.beginPath(); context.arc(projectX(horizontal), projectY(vertical), 4, 0, Math.PI * 2); context.fill();
        }
      }
      context.fillStyle = '#b8c7c1'; context.textAlign = 'center'; context.fillText(xLabel, (left + right) / 2, height - 5);
    }
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    draw();
    document.fonts.ready.then(draw);
    return () => observer.disconnect();
  }, [series, xLabel]);
  return <figure className="plot"><div className="plot-axis-label">{yLabel} / logarithmic scale</div><canvas ref={canvas} role="img" aria-label={description} data-testid={testId} /><figcaption>{series.map(line => <span key={line.name}><i className="swatch" style={{ backgroundColor: line.color }} />{line.name}</span>)}</figcaption><p className="small muted">{description}</p></figure>;
}