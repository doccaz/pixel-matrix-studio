import React, { useRef, useEffect, useState, MouseEvent } from 'react';
import { DrawTool, SelectionRect, FloatingLayer } from '../types';

interface EditorCanvasProps {
  width: number;
  height: number;
  pixels: Uint8Array;
  setPixels: (p: Uint8Array) => void;
  tool: DrawTool;
  zoom: number;
  pixelColor: string;
  onCursorMove?: (x: number | null, y: number | null) => void;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  selection?: SelectionRect | null;
  setSelection?: (rect: SelectionRect | null) => void;
  
  floatingLayer?: FloatingLayer | null;
  setFloatingLayer?: (layer: FloatingLayer | null) => void;
  onLiftSelection?: (rect: SelectionRect) => void;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  width,
  height,
  pixels,
  setPixels,
  tool,
  zoom,
  pixelColor,
  onCursorMove,
  onStrokeStart,
  onStrokeEnd,
  selection,
  setSelection,
  floatingLayer,
  setFloatingLayer,
  onLiftSelection
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);

  // Dragging state for floating layer
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number} | null>(null);

  // Redraw when pixels, dimensions, or selection change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid (Optional, subtle)
    if (zoom >= 4) {
        ctx.strokeStyle = '#334155'; // slate-700
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x <= width; x++) {
            ctx.moveTo(x * zoom, 0);
            ctx.lineTo(x * zoom, height * zoom);
        }
        for (let y = 0; y <= height; y++) {
            ctx.moveTo(0, y * zoom);
            ctx.lineTo(width * zoom, y * zoom);
        }
        ctx.stroke();
    }
    
    // Highlight byte boundaries (every 8 pixels)
    if (zoom >= 2) {
        ctx.strokeStyle = '#475569'; // slate-600, slightly lighter/thicker
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
            ctx.moveTo(x * zoom, 0);
            ctx.lineTo(x * zoom, height * zoom);
        }
        for (let y = 0; y <= height; y += 8) {
            ctx.moveTo(0, y * zoom);
            ctx.lineTo(width * zoom, y * zoom);
        }
        ctx.stroke();
    }

    // Draw Background Pixels
    ctx.fillStyle = pixelColor;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (pixels[idx] === 1) {
            const gap = zoom > 6 ? 1 : 0;
            ctx.fillRect(x * zoom + gap, y * zoom + gap, zoom - gap, zoom - gap);
        }
      }
    }

    // Draw Floating Layer (Paste/Move Buffer)
    if (floatingLayer) {
        // Use same color for floating layer, the border distinguishes it
        ctx.fillStyle = pixelColor;
        for(let cy = 0; cy < floatingLayer.h; cy++) {
            for(let cx = 0; cx < floatingLayer.w; cx++) {
                if (floatingLayer.data[cy * floatingLayer.w + cx]) {
                    const px = floatingLayer.x + cx;
                    const py = floatingLayer.y + cy;
                    // Draw only if within viewport (though canvas clips anyway)
                    const gap = zoom > 6 ? 1 : 0;
                    ctx.fillRect(px * zoom + gap, py * zoom + gap, zoom - gap, zoom - gap);
                }
            }
        }
        
        // Floating Border
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
            floatingLayer.x * zoom, 
            floatingLayer.y * zoom, 
            floatingLayer.w * zoom, 
            floatingLayer.h * zoom
        );
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.lineDashOffset = 4;
        ctx.strokeRect(
            floatingLayer.x * zoom, 
            floatingLayer.y * zoom, 
            floatingLayer.w * zoom, 
            floatingLayer.h * zoom
        );
        ctx.restore();
    }

    // Draw Selection Box (Only if no floating layer active)
    if (selection && !floatingLayer) {
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
            selection.x * zoom, 
            selection.y * zoom, 
            selection.w * zoom, 
            selection.h * zoom
        );
        // Secondary contrast line
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.lineDashOffset = 4;
        ctx.strokeRect(
            selection.x * zoom, 
            selection.y * zoom, 
            selection.w * zoom, 
            selection.h * zoom
        );
        ctx.restore();
    }

  }, [pixels, width, height, zoom, selection, floatingLayer, pixelColor]);

  const getCoords = (e: MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: -1, y: -1 };
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / zoom);
      const y = Math.floor((e.clientY - rect.top) / zoom);
      return { x, y };
  };

  const handleDraw = (e: MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoords(e);
    
    // Handle Floating Layer Drag
    if (isDraggingLayer && floatingLayer && setFloatingLayer && dragOffset) {
        const newX = x - dragOffset.x;
        const newY = y - dragOffset.y;
        
        setFloatingLayer({
            ...floatingLayer,
            x: newX,
            y: newY
        });
        return;
    }

    if (tool === DrawTool.SELECT) {
        // Handle Selection dragging
        if (selectionStart && setSelection) {
            const minX = Math.max(0, Math.min(selectionStart.x, x));
            const minY = Math.max(0, Math.min(selectionStart.y, y));
            const maxX = Math.min(width, Math.max(selectionStart.x, x) + 1);
            const maxY = Math.min(height, Math.max(selectionStart.y, y) + 1);
            
            setSelection({
                x: minX,
                y: minY,
                w: maxX - minX,
                h: maxY - minY
            });
        }
        return;
    }

    // Handle standard drawing
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = y * width + x;
      const shouldErase = tool === DrawTool.ERASER || e.shiftKey;
      const targetVal = shouldErase ? 0 : 1;
      
      if (pixels[idx] !== targetVal) {
          const newPixels = new Uint8Array(pixels);
          newPixels[idx] = targetVal;
          setPixels(newPixels);
      }
    }
  };

  const onMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoords(e);

    // 1. Check if we are clicking on an existing floating layer to drag it
    if (floatingLayer) {
        // We allow dragging even if clicking slightly outside? No, strictly inside for now.
        // Actually, for paste UX, clicking anywhere usually drags if it's the active tool, 
        // but let's stick to inside box or close to it. 
        // For better UX, if floating layer is active, ANY click drags it if tool is Select, 
        // or we can require clicking inside. 
        // Let's require clicking inside the bounds to avoid confusion.
        if (x >= floatingLayer.x && x < floatingLayer.x + floatingLayer.w &&
            y >= floatingLayer.y && y < floatingLayer.y + floatingLayer.h) {
            setIsDraggingLayer(true);
            setDragOffset({ x: x - floatingLayer.x, y: y - floatingLayer.y });
            return; 
        } else {
            // Clicking outside a floating layer usually commits it. 
            // We can rely on App.tsx via Enter key, or just do nothing here.
            // Let's do nothing and force Enter for now, or allow re-selection logic below?
            // If we re-select, we lose the float. Let's keep it modal until Enter/Esc.
            return;
        }
    }
    
    // 2. Check for Shift+Drag to LIFT selection
    if (tool === DrawTool.SELECT && e.shiftKey && selection && onLiftSelection &&
        x >= selection.x && x < selection.x + selection.w &&
        y >= selection.y && y < selection.y + selection.h) {
        
        onLiftSelection(selection);
        // Immediately start dragging the new layer
        setIsDraggingLayer(true);
        setDragOffset({ x: x - selection.x, y: y - selection.y });
        return;
    }
    
    // 3. Normal Selection / Drawing
    if (tool !== DrawTool.SELECT && selection && setSelection) {
        setSelection(null);
    }

    setIsDrawing(true);
    
    if (tool === DrawTool.SELECT) {
        setSelectionStart({ x, y });
        if (setSelection) setSelection(null); 
    } else {
        if (onStrokeStart) onStrokeStart();
        handleDraw(e);
    }
  };

  const onMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoords(e);
    
    if (onCursorMove) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            onCursorMove(x, y);
        } else {
            onCursorMove(null, null);
        }
    }

    if (isDrawing || isDraggingLayer) handleDraw(e);
  };

  const onMouseUp = () => {
    setIsDraggingLayer(false);
    setDragOffset(null);

    if (isDrawing) {
        if (tool !== DrawTool.SELECT && onStrokeEnd) {
            onStrokeEnd();
        }
        setIsDrawing(false);
        setSelectionStart(null);
    }
  };

  const onMouseLeave = () => {
      onMouseUp(); 
      onCursorMove?.(null, null);
  };
  
  const rulerStep = zoom >= 16 ? 1 : zoom >= 8 ? 4 : 8;

  return (
    <div className="overflow-auto bg-slate-950 border border-slate-700 rounded-lg shadow-inner flex items-center justify-center p-8 w-full h-full">
      <div className="relative">
          {/* Top Ruler */}
          <div className="absolute -top-6 left-0 right-0 h-6 border-b border-slate-700">
             {Array.from({ length: Math.ceil(width / rulerStep) + 1 }).map((_, i) => {
                 const val = i * rulerStep;
                 if (val > width) return null;
                 const left = val * zoom;
                 return (
                     <div key={`tx-${val}`} className="absolute top-0 bottom-0 flex flex-col justify-end items-center" style={{ left: left, width: 0 }}>
                         <div className="h-2 w-px bg-slate-500"></div>
                         <span className="text-[9px] text-slate-400 -translate-y-2">{val}</span>
                     </div>
                 );
             })}
          </div>

          {/* Left Ruler */}
          <div className="absolute top-0 -left-8 bottom-0 w-8 border-r border-slate-700">
             {Array.from({ length: Math.ceil(height / rulerStep) + 1 }).map((_, i) => {
                 const val = i * rulerStep;
                 if (val > height) return null;
                 const top = val * zoom;
                 return (
                     <div key={`ty-${val}`} className="absolute left-0 right-0 flex flex-row justify-end items-center" style={{ top: top, height: 0 }}>
                         <span className="text-[9px] text-slate-400 -translate-x-2">{val}</span>
                         <div className="w-2 h-px bg-slate-500"></div>
                     </div>
                 );
             })}
          </div>

          <canvas
            ref={canvasRef}
            width={width * zoom}
            height={height * zoom}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            className={`shadow-xl shadow-black bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-slate-900 
                ${(isDraggingLayer) ? 'cursor-move' : (tool === DrawTool.SELECT ? 'cursor-crosshair' : 'cursor-crosshair')}`}
            style={{ imageRendering: 'pixelated' }}
          />
      </div>
    </div>
  );
};

export default EditorCanvas;