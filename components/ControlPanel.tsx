import React, { useRef, useState } from 'react';
import { Download, Upload, Eraser, Wand2, Monitor, Code2, Image as ImageIcon, BoxSelect, Undo2, Redo2, Copy, Scissors, Clipboard, Github, Keyboard, HelpCircle, XSquare } from 'lucide-react';
import { DrawTool, ScanMode, ByteOrder, Preset } from '../types';

interface ControlPanelProps {
  width: number;
  height: number;
  setDimensions: (w: number, h: number) => void;
  tool: DrawTool;
  setTool: (t: DrawTool) => void;
  clearCanvas: () => void;
  invertCanvas: () => void;
  onImportImage: (file: File) => void;
  scanMode: ScanMode;
  setScanMode: (m: ScanMode) => void;
  byteOrder: ByteOrder;
  setByteOrder: (b: ByteOrder) => void;
  setPixels: (p: Uint8Array) => void;
  
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDeselect: () => void;
  hasSelection: boolean;
  hasClipboard: boolean;
}

const PRESETS: Preset[] = [
  { name: 'SSD1306 OLED', width: 128, height: 64 },
  { name: 'SSD1306 Slim', width: 128, height: 32 },
  { name: 'Nokia 5110', width: 84, height: 48 },
  { name: 'Matrix 8x8', width: 8, height: 8 },
  { name: 'Icon 32x32', width: 32, height: 32 },
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  width, height, setDimensions,
  tool, setTool, clearCanvas, invertCanvas,
  onImportImage, scanMode, setScanMode, byteOrder, setByteOrder, setPixels,
  canUndo, canRedo, onUndo, onRedo,
  onCopy, onCut, onPaste, onDeselect, hasSelection, hasClipboard
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-80 bg-lcd-panel border-r border-slate-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-700 shrink-0">
        <h1 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
           <Monitor size={24} /> Pixel Matrix Studio
        </h1>
        <div className="flex items-center justify-between mt-1">
             <p className="text-xs text-slate-400">Embedded Graphics Studio</p>
             <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">v1.1.0</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Dimensions */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-300">Dimensions</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Width</span>
              <input 
                type="number" 
                value={width} 
                onChange={(e) => setDimensions(Number(e.target.value), height)}
                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-1">Height</span>
              <input 
                type="number" 
                value={height} 
                onChange={(e) => setDimensions(width, Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm focus:border-cyan-500 outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button 
                key={p.name}
                onClick={() => setDimensions(p.width, p.height)}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* History Controls */}
        <div className="flex gap-2">
            <button 
                onClick={onUndo} 
                disabled={!canUndo}
                className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 py-1 rounded text-xs transition-colors"
                title="Undo (Ctrl+Z)"
            >
                <Undo2 size={14} /> Undo
            </button>
            <button 
                onClick={onRedo} 
                disabled={!canRedo}
                className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 py-1 rounded text-xs transition-colors"
                title="Redo (Ctrl+Y)"
            >
                <Redo2 size={14} /> Redo
            </button>
        </div>

        {/* Tools */}
        <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300">Tools</label>
            <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button 
                    onClick={() => setTool(DrawTool.PEN)}
                    className={`flex-1 flex items-center justify-center p-2 rounded ${tool === DrawTool.PEN ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Pen"
                >
                    <Wand2 size={18} />
                </button>
                <button 
                    onClick={() => setTool(DrawTool.ERASER)}
                    className={`flex-1 flex items-center justify-center p-2 rounded ${tool === DrawTool.ERASER ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Eraser (Hold Shift)"
                >
                    <Eraser size={18} />
                </button>
                <button 
                    onClick={() => setTool(DrawTool.SELECT)}
                    className={`flex-1 flex items-center justify-center p-2 rounded ${tool === DrawTool.SELECT ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Select Area"
                >
                    <BoxSelect size={18} />
                </button>
            </div>
            
            {/* Edit Actions */}
             <div className="flex gap-1">
                <button onClick={onCut} disabled={!hasSelection} className="flex-1 flex items-center justify-center p-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300" title="Cut">
                    <Scissors size={14} />
                </button>
                <button onClick={onCopy} disabled={!hasSelection} className="flex-1 flex items-center justify-center p-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300" title="Copy">
                    <Copy size={14} />
                </button>
                <button onClick={onPaste} disabled={!hasClipboard} className="flex-1 flex items-center justify-center p-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300" title="Paste">
                    <Clipboard size={14} />
                </button>
                <button onClick={onDeselect} disabled={!hasSelection} className="flex-1 flex items-center justify-center p-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300" title="Deselect All">
                    <XSquare size={14} />
                </button>
            </div>

             <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={clearCanvas} className="bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 p-2 rounded text-xs">Clear All</button>
                <button onClick={invertCanvas} className="bg-slate-700 text-slate-200 hover:bg-slate-600 p-2 rounded text-xs">Invert</button>
            </div>
        </div>

        {/* Import */}
        <div className="space-y-3">
             <label className="text-sm font-semibold text-slate-300">Import</label>
             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".png,.jpg,.jpeg,.bmp,.svg"
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        onImportImage(e.target.files[0]);
                        e.target.value = '';
                    }
                }}
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-slate-600 hover:border-cyan-500 text-slate-300 p-2 rounded flex items-center justify-center gap-2 text-sm transition-colors"
             >
                <ImageIcon size={16} /> Import Image
             </button>
        </div>

        {/* Export Settings */}
         <div className="space-y-3">
             <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                 <Code2 size={16} /> Export Settings
             </label>
             
             <div>
                <span className="text-xs text-slate-500 block mb-1">Scan Mode</span>
                <select 
                    value={scanMode}
                    onChange={(e) => setScanMode(e.target.value as ScanMode)}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs outline-none"
                >
                    <option value={ScanMode.HORIZONTAL_RASTER}>Horizontal (Raster)</option>
                    <option value={ScanMode.VERTICAL_PAGE}>Vertical (SSD1306/Page)</option>
                </select>
             </div>

             <div>
                <span className="text-xs text-slate-500 block mb-1">Endianness</span>
                <select 
                     value={byteOrder}
                     onChange={(e) => setByteOrder(e.target.value as ByteOrder)}
                     className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs outline-none"
                >
                    <option value={ByteOrder.MSB_FIRST}>MSB First</option>
                    <option value={ByteOrder.LSB_FIRST}>LSB First</option>
                </select>
             </div>
         </div>
         
         {/* Help & Links */}
         <div className="pt-4 border-t border-slate-700 mt-auto">
             <div className="bg-slate-900/50 p-3 rounded text-[10px] text-slate-400 space-y-2 border border-slate-800">
                <h3 className="font-bold text-slate-300 flex items-center gap-1"><Keyboard size={10} /> Shortcuts & Tips</h3>
                <ul className="space-y-1 list-disc pl-3">
                    <li><span className="text-cyan-400">Shift + Drag</span> Select tool to cut/move.</li>
                    <li><span className="text-cyan-400">Enter</span> to commit Paste/Move.</li>
                    <li><span className="text-cyan-400">Esc</span> to cancel Paste/Move.</li>
                    <li><span className="text-cyan-400">Ctrl+Z</span> Undo, <span className="text-cyan-400">Ctrl+Y</span> Redo.</li>
                </ul>
             </div>
             
             <a href="https://github.com/doccaz/pixel-matrix-studio/" target="_blank" rel="noreferrer" 
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-400 mt-4 transition-colors group">
                 <Github size={14} className="group-hover:text-white" />
                 <span>Fork me at GitHub</span>
             </a>
         </div>

      </div>
    </div>
  );
};

export default ControlPanel;