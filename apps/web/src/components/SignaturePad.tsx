// SPDX-License-Identifier: AGPL-3.0-or-later
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@humanix/ui';

/** Zone de signature manuscrite tactile/souris/stylet. Notifie quand un tracé est présent. */
export function SignaturePad({ onChange }: { onChange: (hasDrawing: boolean) => void }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    if (!hasDrawing) {
      setHasDrawing(true);
      onChange(true);
    }
  }
  function end() {
    drawing.current = false;
  }
  function clear() {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setHasDrawing(false);
    onChange(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={160}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        aria-label={t('sign.methodManuscrite')}
        className="w-full touch-none rounded-lg border border-dashed border-slate-400 bg-white"
      />
      <Button type="button" variant="ghost" size="sm" onPress={clear} className="self-start">
        {t('sign.clear')}
      </Button>
    </div>
  );
}
