import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import EditorCanvas from './components/EditorCanvas';
import CodeBlock from './components/CodeBlock';
import { DrawTool, ScanMode, ByteOrder, SelectionRect, FloatingLayer } from './types';
import { generateCArray, processImageFile } from './utils/bitmapUtils';

interface ClipboardData {
  width: number;
  height: number;
  pixels: Uint8Array;
}

const PIXEL_COLORS = [
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Green', value: '#4ade80' },
  { name: 'Blue', value: '#38bdf8' },
  { name: 'White', value: '#f8fafc' },
  { name: 'Yellow', value: '#facc15' },
];

const App: React.FC = () => {
  // State
  const [width, setWidth] = useState(128);
  const [height, setHeight] = useState(64);
  const [pixels, setPixels] = useState<Uint8Array>(new Uint8Array(128 * 64));
  
  // History
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [tool, setTool] = useState<DrawTool>(DrawTool.PEN);
  const [scanMode, setScanMode] = useState<ScanMode>(ScanMode.VERTICAL_PAGE);
  const [byteOrder, setByteOrder] = useState<ByteOrder>(ByteOrder.MSB_FIRST); 
  const [zoom, setZoom] = useState(6);
  const [pixelColor, setPixelColor] = useState(PIXEL_COLORS[0].value);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);
  const [lastImageFile, setLastImageFile] = useState<File | null>(null);
  
  // Selection, Clipboard, Floating Layer
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [floatingLayer, setFloatingLayer] = useState<FloatingLayer | null>(null);
  // Snapshot of pixels BEFORE the floating layer was lifted (for Cancel/Esc)
  const [backgroundSnapshot, setBackgroundSnapshot] = useState<Uint8Array | null>(null);

  // Initialize History on load
  useEffect(() => {
    if (history.length === 0) {
        setHistory([new Uint8Array(128 * 64)]);
        setHistoryIndex(0);
    }
  }, []);

  // --- History Management ---

  const addToHistory = useCallback((newPixels: Uint8Array) => {
    const newHistory = history.slice(0, historyIndex + 1);
    // Limit history size to 50 steps to save memory
    if (newHistory.length > 50) newHistory.shift();
    
    newHistory.push(new Uint8Array(newPixels)); // Clone
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
      // If a floating layer is active, Undo simply cancels the float
      if (floatingLayer) {
          handleDiscardFloatingLayer();
          return;
      }
      if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setPixels(new Uint8Array(history[newIndex]));
      }
  }, [history, historyIndex, floatingLayer]);

  const handleRedo = useCallback(() => {
      if (floatingLayer) return; // Can't redo while floating
      if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setPixels(new Uint8Array(history[newIndex]));
      }
  }, [history, historyIndex, floatingLayer]);

  // Wrapper for modifying pixels that respects history
  // Pass `saveHistory: true` when a stroke ends or an operation completes
  const updatePixels = (newPixels: Uint8Array, saveHistory: boolean = false) => {
      setPixels(newPixels);
      if (saveHistory) {
          addToHistory(newPixels);
      }
  };

  // Called by Canvas when a drawing stroke begins
  const handleStrokeStart = () => {
      // Logic managed by strokeEnd
  };

  // Called by Canvas when a drawing stroke ends
  const handleStrokeEnd = () => {
      if (!floatingLayer) {
        addToHistory(pixels);
      }
  };

  // --- Dimensions & Import ---

  const handleSetDimensions = (w: number, h: number) => {
      setWidth(w);
      setHeight(h);
      
      let newP = new Uint8Array(w * h);

      if (lastImageFile) {
          processImageFile(lastImageFile, w, h).then(newPixels => {
              updatePixels(newPixels, true);
          }).catch(err => {
              console.error("Failed to resize image:", err);
              updatePixels(newP, true);
          });
      } else {
          updatePixels(newP, true);
      }
      setHistory([]); 
      setHistoryIndex(-1);
      setTimeout(() => {
          setHistory([newP]);
          setHistoryIndex(0);
      }, 0);
  };

  const clearCanvas = () => {
      setLastImageFile(null);
      setFloatingLayer(null);
      updatePixels(new Uint8Array(width * height), true);
  };
  
  const invertCanvas = () => {
    const next = new Uint8Array(pixels.length);
    for(let i=0; i<pixels.length; i++) next[i] = pixels[i] ? 0 : 1;
    updatePixels(next, true);
  };

  const handleImportImage = async (file: File) => {
    setLastImageFile(file);
    try {
        const newPixels = await processImageFile(file, width, height);
        updatePixels(newPixels, true);
    } catch (e) {
        alert("Error importing image");
    }
  };

  const handleImportCode = (
    importedPixels: Uint8Array, 
    config: { width: number; height: number; scanMode: ScanMode; byteOrder: ByteOrder }
  ) => {
      setLastImageFile(null);
      setWidth(config.width);
      setHeight(config.height);
      setScanMode(config.scanMode);
      setByteOrder(config.byteOrder);
      
      // Reset History
      setHistory([importedPixels]);
      setHistoryIndex(0);
      setPixels(importedPixels);
  };

  // --- Clipboard & Floating Layer Operations ---

  const handleCopy = useCallback(() => {
      if (!selection) return;
      
      const { x, y, w, h } = selection;
      const clipPixels = new Uint8Array(w * h);
      
      for(let cy = 0; cy < h; cy++) {
          for(let cx = 0; cx < w; cx++) {
              const srcIdx = (y + cy) * width + (x + cx);
              if (srcIdx < pixels.length) {
                  clipPixels[cy * w + cx] = pixels[srcIdx];
              }
          }
      }
      setClipboard({ width: w, height: h, pixels: clipPixels });
  }, [selection, pixels, width]);

  const handleCut = useCallback(() => {
      if (!selection) return;
      handleCopy(); 
      
      const { x, y, w, h } = selection;
      const newPixels = new Uint8Array(pixels);
      for(let cy = 0; cy < h; cy++) {
          for(let cx = 0; cx < w; cx++) {
              const idx = (y + cy) * width + (x + cx);
              if (idx < newPixels.length) newPixels[idx] = 0;
          }
      }
      updatePixels(newPixels, true);
  }, [selection, pixels, width, handleCopy]);

  const handlePaste = useCallback(() => {
      if (!clipboard) return;
      
      // If there's already a floating layer, commit it first
      if (floatingLayer) {
          handleCommitFloatingLayer();
      }

      // Store current background state in case of Cancel
      setBackgroundSnapshot(new Uint8Array(pixels));

      // Paste centers at selection, or top-left if no selection
      const startX = selection ? selection.x : 0;
      const startY = selection ? selection.y : 0;
      
      setFloatingLayer({
          x: startX,
          y: startY,
          w: clipboard.width,
          h: clipboard.height,
          data: new Uint8Array(clipboard.pixels)
      });
      
      setTool(DrawTool.SELECT);
  }, [clipboard, selection, pixels, floatingLayer]);

  // Lift selected pixels into a floating layer (Shift+Drag behavior)
  const handleLiftSelection = useCallback((rect: SelectionRect) => {
      if (floatingLayer) handleCommitFloatingLayer();

      // Store background for restore on Esc
      setBackgroundSnapshot(new Uint8Array(pixels));

      // Create the floating buffer
      const buffer = new Uint8Array(rect.w * rect.h);
      const newPixels = new Uint8Array(pixels);

      for(let cy = 0; cy < rect.h; cy++) {
          for(let cx = 0; cx < rect.w; cx++) {
              const idx = (rect.y + cy) * width + (rect.x + cx);
              if (idx < pixels.length) {
                  buffer[cy * rect.w + cx] = pixels[idx];
                  newPixels[idx] = 0; // Cut from background
              }
          }
      }

      setPixels(newPixels); // Update visual background to show the cut
      setFloatingLayer({
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h,
          data: buffer
      });
  }, [pixels, width, floatingLayer]);

  const handleCommitFloatingLayer = useCallback(() => {
      if (!floatingLayer) return;
      
      const newPixels = new Uint8Array(pixels);
      
      for(let cy = 0; cy < floatingLayer.h; cy++) {
          for(let cx = 0; cx < floatingLayer.w; cx++) {
              const targetX = floatingLayer.x + cx;
              const targetY = floatingLayer.y + cy;
              
              if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
                  const val = floatingLayer.data[cy * floatingLayer.w + cx];
                  // Simple overwrite merge (opaque)
                  newPixels[targetY * width + targetX] = val;
              }
          }
      }
      
      updatePixels(newPixels, true); // Commit to history
      
      setSelection(null); // Deselect after commit
      setFloatingLayer(null);
      setBackgroundSnapshot(null);
  }, [floatingLayer, pixels, width, height]);

  const handleDiscardFloatingLayer = useCallback(() => {
      if (!floatingLayer) return;
      
      // Restore the background (if we cut something, it goes back. If we pasted, it disappears)
      if (backgroundSnapshot) {
          setPixels(backgroundSnapshot);
      }
      
      setFloatingLayer(null);
      setBackgroundSnapshot(null);
  }, [floatingLayer, backgroundSnapshot]);

  const handleDeselect = useCallback(() => {
      if (floatingLayer) {
          handleCommitFloatingLayer();
      } else {
          setSelection(null);
      }
  }, [floatingLayer, handleCommitFloatingLayer]);

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          // Enter to Commit Paste/Move
          if (e.key === 'Enter') {
              if (floatingLayer) {
                  e.preventDefault();
                  handleCommitFloatingLayer();
              }
          }
          // Escape to Cancel
          if (e.key === 'Escape') {
              if (floatingLayer) {
                  e.preventDefault();
                  handleDiscardFloatingLayer();
              } else if (selection) {
                  setSelection(null);
              }
          }

          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              e.preventDefault();
              handleUndo();
          }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
              e.preventDefault();
              handleRedo();
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
              if (selection && !floatingLayer) {
                  e.preventDefault();
                  handleCopy();
              }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
               if (selection && !floatingLayer) {
                  e.preventDefault();
                  handleCut();
               }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
              e.preventDefault();
              handlePaste();
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
             if (floatingLayer) {
                 handleDiscardFloatingLayer(); // Treat delete on floating as cancel
             } else if (selection) {
                 const { x, y, w, h } = selection;
                 const newPixels = new Uint8Array(pixels);
                 for(let cy = 0; cy < h; cy++) {
                     for(let cx = 0; cx < w; cx++) {
                         const idx = (y + cy) * width + (x + cx);
                         if (idx < newPixels.length) newPixels[idx] = 0;
                     }
                 }
                 updatePixels(newPixels, true);
             }
          }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handleCut, handlePaste, handleCommitFloatingLayer, handleDiscardFloatingLayer, selection, clipboard, pixels, width, floatingLayer]);


  const generatedCode = useMemo(() => {
    // Merge floating layer into export pixels so CodeBlock reflects what is seen
    let exportPixels = pixels;

    if (floatingLayer) {
        exportPixels = new Uint8Array(pixels); // Clone
        for(let cy = 0; cy < floatingLayer.h; cy++) {
            for(let cx = 0; cx < floatingLayer.w; cx++) {
                const targetX = floatingLayer.x + cx;
                const targetY = floatingLayer.y + cy;
                
                if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
                    const val = floatingLayer.data[cy * floatingLayer.w + cx];
                    exportPixels[targetY * width + targetX] = val;
                }
            }
        }
    }

    return generateCArray(exportPixels, width, height, scanMode, byteOrder);
  }, [pixels, width, height, scanMode, byteOrder, floatingLayer]);

  return (
    <div className="flex h-screen w-screen bg-lcd-bg text-slate-200">
      
      <ControlPanel 
        width={width}
        height={height}
        setDimensions={handleSetDimensions}
        tool={tool}
        setTool={setTool}
        clearCanvas={clearCanvas}
        invertCanvas={invertCanvas}
        onImportImage={handleImportImage}
        scanMode={scanMode}
        setScanMode={setScanMode}
        byteOrder={byteOrder}
        setByteOrder={setByteOrder}
        setPixels={(p) => updatePixels(p, true)}
        canUndo={historyIndex > 0 || !!floatingLayer}
        canRedo={historyIndex < history.length - 1 && !floatingLayer}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onDeselect={handleDeselect}
        hasSelection={!!selection || !!floatingLayer}
        hasClipboard={!!clipboard}
      />

      <div className="flex-1 flex flex-col h-full min-w-0">
        
        <div className="flex-1 relative flex flex-col">
            <div className="h-12 border-b border-slate-700 bg-slate-900 flex items-center justify-between px-4">
                <span className="text-sm font-semibold text-slate-400">Visual Editor</span>
                
                <div className="flex items-center gap-6">
                    {cursorPos && (
                        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50">
                            <span className="w-[3.5rem]">X: {cursorPos.x.toString().padStart(3, ' ')}</span>
                            <span className="w-[3.5rem] border-l border-slate-700 pl-2">Y: {cursorPos.y.toString().padStart(3, ' ')}</span>
                        </div>
                    )}
                    
                    {/* Color Picker */}
                    <div className="flex items-center gap-2 border-r border-slate-700 pr-6 mr-2">
                         <div className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1 border border-slate-700">
                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: pixelColor }}></div>
                            <select 
                                value={pixelColor}
                                onChange={(e) => setPixelColor(e.target.value)}
                                className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer w-20"
                            >
                                {PIXEL_COLORS.map(c => (
                                    <option key={c.value} value={c.value} className="bg-slate-800">{c.name}</option>
                                ))}
                            </select>
                         </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Zoom: {zoom}x</span>
                        <input 
                            type="range" 
                            min="1" max="20" 
                            value={zoom} 
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>
            
            <div className="flex-1 bg-[#0b1221] overflow-hidden flex items-center justify-center p-8 relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                     style={{
                        backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
                        backgroundSize: '20px 20px'
                     }}>
                </div>
                
                <EditorCanvas 
                    width={width}
                    height={height}
                    pixels={pixels}
                    setPixels={(p) => updatePixels(p, false)} 
                    tool={tool}
                    zoom={zoom}
                    pixelColor={pixelColor}
                    onCursorMove={(x, y) => setCursorPos(x !== null && y !== null ? {x, y} : null)}
                    onStrokeStart={handleStrokeStart}
                    onStrokeEnd={handleStrokeEnd}
                    selection={selection}
                    setSelection={setSelection}
                    floatingLayer={floatingLayer}
                    setFloatingLayer={setFloatingLayer}
                    onLiftSelection={handleLiftSelection}
                />
            </div>
        </div>

        <div className="h-1/3 min-h-[200px] bg-slate-950 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] z-10">
            <CodeBlock 
                code={generatedCode} 
                width={width}
                height={height}
                scanMode={scanMode}
                byteOrder={byteOrder}
                onImport={handleImportCode} 
            />
        </div>
      </div>
    </div>
  );
};

export default App;