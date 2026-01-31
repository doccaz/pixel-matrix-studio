import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Import, X, RefreshCw, Eye } from 'lucide-react';
import { ScanMode, ByteOrder } from '../types';
import { parseCArray } from '../utils/bitmapUtils';

interface CodeBlockProps {
  code: string;
  width: number;
  height: number;
  scanMode: ScanMode;
  byteOrder: ByteOrder;
  onImport: (pixels: Uint8Array, config: { width: number; height: number; scanMode: ScanMode; byteOrder: ByteOrder }) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, width, height, scanMode, byteOrder, onImport }) => {
  const [copied, setCopied] = useState(false);
  
  // Import Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState("");
  const [impWidth, setImpWidth] = useState(width);
  const [impHeight, setImpHeight] = useState(height);
  const [impScanMode, setImpScanMode] = useState(scanMode);
  const [impByteOrder, setImpByteOrder] = useState(byteOrder);
  const [previewPixels, setPreviewPixels] = useState<Uint8Array | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync default import settings when entering edit mode
  useEffect(() => {
    if (isEditing) {
        setEditCode(""); 
        setImpWidth(width);
        setImpHeight(height);
        setImpScanMode(scanMode);
        setImpByteOrder(byteOrder);
        setPreviewPixels(null);
    }
  }, [isEditing, width, height, scanMode, byteOrder]);

  // Preview Drawing Effect
  useEffect(() => {
    if (!canvasRef.current || !previewPixels) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Calculate reasonable zoom to fit the preview box (approx 150px height available)
    const containerH = 140; 
    const containerW = 200;
    const scale = Math.max(1, Math.min(Math.floor(containerW / impWidth), Math.floor(containerH / impHeight), 6));
    
    canvasRef.current.width = impWidth * scale;
    canvasRef.current.height = impHeight * scale;
    
    // Background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw Pixels
    ctx.fillStyle = '#06b6d4'; // cyan-500
    for(let y = 0; y < impHeight; y++) {
        for(let x = 0; x < impWidth; x++) {
            if (previewPixels[y * impWidth + x]) {
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }
  }, [previewPixels, impWidth, impHeight]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreview = () => {
      if (!editCode.trim()) return;
      const pixels = parseCArray(editCode, impWidth, impHeight, impScanMode, impByteOrder);
      if (pixels) {
          setPreviewPixels(pixels);
      } else {
          alert("Could not parse array. Check syntax.");
      }
  };

  const handleApplyImport = () => {
      if (!previewPixels) {
          handlePreview();
          // Small delay to allow state update if user clicks import directly, 
          // but better to force them to preview successfully first or handle sync.
          // For now, require preview to be populated (which means parse worked).
          return;
      }
      onImport(previewPixels, { width: impWidth, height: impHeight, scanMode: impScanMode, byteOrder: impByteOrder });
      setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col h-full bg-slate-950 border-t border-slate-700">
          {/* Import Toolbar */}
          <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-700 gap-2">
               <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mask-gradient-r">
                  <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Import Settings:</span>
                  
                  <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">W</span>
                      <input 
                        type="number" 
                        value={impWidth} 
                        onChange={e => setImpWidth(Number(e.target.value))} 
                        className="w-12 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs text-center outline-none focus:border-cyan-500" 
                      />
                  </div>
                  <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">H</span>
                      <input 
                        type="number" 
                        value={impHeight} 
                        onChange={e => setImpHeight(Number(e.target.value))} 
                        className="w-12 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs text-center outline-none focus:border-cyan-500" 
                      />
                  </div>
                  
                  <select 
                    value={impScanMode} 
                    onChange={e => setImpScanMode(e.target.value as ScanMode)} 
                    className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs outline-none focus:border-cyan-500"
                  >
                      <option value={ScanMode.VERTICAL_PAGE}>Vertical (Page/OLED)</option>
                      <option value={ScanMode.HORIZONTAL_RASTER}>Horizontal (Raster)</option>
                  </select>
                  
                  <select 
                    value={impByteOrder} 
                    onChange={e => setImpByteOrder(e.target.value as ByteOrder)} 
                    className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs outline-none focus:border-cyan-500"
                  >
                      <option value={ByteOrder.MSB_FIRST}>MSB First</option>
                      <option value={ByteOrder.LSB_FIRST}>LSB First</option>
                  </select>

                  <button 
                    onClick={handlePreview} 
                    className="flex items-center gap-1 bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-400 px-2 py-0.5 rounded transition-colors text-xs border border-cyan-900/50" 
                    title="Refresh Preview"
                  >
                      <RefreshCw size={12} /> Preview
                  </button>
               </div>

               <button 
                  onClick={() => setIsEditing(false)} 
                  className="text-slate-400 hover:text-white p-1"
                  title="Cancel"
                >
                  <X size={16} />
               </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
              {/* Paste Area */}
              <div className="flex-1 border-r border-slate-700 relative flex flex-col">
                  <textarea 
                      className="flex-1 w-full bg-slate-950 text-slate-300 font-mono text-xs p-3 resize-none outline-none focus:ring-1 focus:ring-cyan-900/50"
                      placeholder={`Paste C array body here.\nExample: { 0x00, 0xFF, 0xA5 ... }`}
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      autoFocus
                  />
                  <div className="bg-slate-900 text-[10px] text-slate-500 p-1 px-2 border-t border-slate-800 text-right">
                      Paste only the array content (between curly braces) or the full definition.
                  </div>
              </div>
              
              {/* Preview Panel */}
              <div className="w-1/3 min-w-[180px] bg-slate-900/50 flex flex-col items-center justify-center p-4 gap-3 relative">
                  <div className="flex-1 flex items-center justify-center w-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-slate-950 border border-slate-700 rounded shadow-inner overflow-hidden">
                     {previewPixels ? (
                         <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
                     ) : (
                         <div className="text-slate-600 flex flex-col items-center gap-1 text-xs opacity-50">
                             <Eye size={24} />
                             <span>Preview Area</span>
                         </div>
                     )}
                  </div>
                  
                  <button 
                      onClick={handleApplyImport}
                      disabled={!previewPixels}
                      className={`w-full py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          previewPixels 
                          ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20' 
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                  >
                      <Import size={14} /> Import Data
                  </button>
              </div>
          </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 border-t border-slate-700">
        <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-700">
            <span className="text-xs font-mono text-cyan-400">output.c</span>
            <div className="flex gap-2">
                <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                >
                    <Import size={12} /> Import
                </button>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-400 rounded transition-colors"
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
        </div>
        <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300">
             <pre className="whitespace-pre-wrap">{code}</pre>
        </div>
    </div>
  );
};

export default CodeBlock;