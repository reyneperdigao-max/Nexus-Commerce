import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (hasSignature: boolean, dataUrl: string) => void;
  disabled?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSignatureChange, disabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastWidthRef = useRef(0);
  const hasSignatureRef = useRef(false);

  const [hasSignature, setHasSignature] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  const configureContext = (ctx: CanvasRenderingContext2D, dpr: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
  };

  // Redimensiona o canvas apenas quando a largura muda de fato (evita apagar no scroll mobile)
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const targetWidth = Math.floor(rect.width);
    if (targetWidth <= 0) return;

    if (lastWidthRef.current > 0 && Math.abs(targetWidth - lastWidthRef.current) <= 2) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const targetHeight = 180;

    let snapshotUrl: string | null = null;
    if (hasSignatureRef.current && canvas.width > 0 && canvas.height > 0) {
      try {
        snapshotUrl = canvas.toDataURL('image/png');
      } catch {
        snapshotUrl = null;
      }
    }

    lastWidthRef.current = targetWidth;
    canvas.width = Math.round(targetWidth * dpr);
    canvas.height = Math.round(targetHeight * dpr);
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    configureContext(ctx, dpr);

    if (snapshotUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      };
      img.src = snapshotUrl;
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(container);
    }
    window.addEventListener('resize', resizeCanvas);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignora caso não suportado
    }

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);

    isDrawingRef.current = true;
    hasSignatureRef.current = true;
    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e) {
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignora
      }
    }

    setStrokeCount(prev => prev + 1);
    const dataUrl = canvas.toDataURL('image/png');
    hasSignatureRef.current = true;
    setHasSignature(true);
    onSignatureChange(true, dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    hasSignatureRef.current = false;
    setHasSignature(false);
    setStrokeCount(0);
    onSignatureChange(false, '');
  };

  return (
    <div className="flex flex-col gap-2 w-full" ref={containerRef}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <PenTool size={13} className="text-amber-400" />
          <span>Desenhe sua assinatura no quadro abaixo:</span>
        </div>
        {hasSignature && (
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            title="Limpar e refazer assinatura"
          >
            <RotateCcw size={12} />
            <span>Limpar</span>
          </button>
        )}
      </div>

      <div className="relative border-2 border-dashed border-slate-300 hover:border-amber-400 focus-within:border-amber-500 rounded-2xl bg-white shadow-inner overflow-hidden transition-all">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          style={{ touchAction: 'none' }}
          className="w-full h-[180px] block cursor-crosshair select-none"
        />

        {/* Linha guia de assinatura e marca d'água */}
        <div className="absolute inset-x-6 bottom-7 pointer-events-none flex flex-col items-center">
          <div className="w-full border-b border-slate-200"></div>
          <span className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase mt-1">
            Linha de Assinatura
          </span>
        </div>

        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-400 bg-white/80 px-3 py-1 rounded-full shadow-sm">
              Toque com o dedo ou mouse aqui para assinar
            </span>
          </div>
        )}

        {hasSignature && strokeCount > 0 && (
          <div className="absolute top-2 right-2 pointer-events-none flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-xs">
            <CheckCircle2 size={11} />
            <span>Traçado capturado</span>
          </div>
        )}
      </div>
    </div>
  );
};
