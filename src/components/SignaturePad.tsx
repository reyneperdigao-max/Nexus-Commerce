import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (hasSignature: boolean, dataUrl: string) => void;
  disabled?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSignatureChange, disabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  // Redimensiona o canvas para máxima nitidez (DPI Scaling)
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Guarda o desenho atual antes de redimensionar
    let prevData: ImageData | null = null;
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        // Ignora
      }
    }

    canvas.width = rect.width * dpr;
    canvas.height = 180 * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `180px`;

    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#0f172a'; // Tinta escura elegante (slate-900)
    }

    if (ctx && prevData) {
      try {
        ctx.putImageData(prevData, 0, 0);
      } catch {
        // Ignora
      }
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    const mouseEvent = e as MouseEvent | React.MouseEvent;
    return {
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Previne rolagem de página no celular durante a assinatura
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
    }

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    setStrokeCount(prev => prev + 1);

    // Exporta imagem em PNG transparente de alta qualidade
    const dataUrl = canvas.toDataURL('image/png');
    setHasSignature(true);
    onSignatureChange(true, dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasSignature(false);
    setStrokeCount(0);
    onSignatureChange(false, '');
  };

  return (
    <div className="flex flex-col gap-2 w-full" ref={containerRef}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <PenTool size={13} className="text-amber-500" />
          <span>Desenhe sua assinatura no quadro abaixo:</span>
        </div>
        {hasSignature && (
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
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
              ✍️ Toque com o dedo ou mouse aqui para assinar
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
