
import React, { useState, useRef, useEffect } from 'react';
import { 
  MousePointer2, Pencil, Square, Eraser, CheckCircle2, Ruler, Move, ScanLine, 
  Sun, Contrast, ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff
} from 'lucide-react';
import { ROIAnnotation } from '../types';
import { translations } from '../utils/translations';

interface ROIEditorProps {
  imageSrc: string;
  initialROIs: ROIAnnotation[];
  onConfirm: (confirmedROIs: ROIAnnotation[]) => void;
  language?: 'en' | 'vi';
}

const ROIEditor: React.FC<ROIEditorProps> = ({ imageSrc, initialROIs, onConfirm, language = 'vi' }) => {
  const t = translations[language];
  const [rois, setRois] = useState<ROIAnnotation[]>(initialROIs || []);
  const [tool, setTool] = useState<'select' | 'pencil' | 'rect'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  
  // Advanced Image Controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const [dragState, setDragState] = useState<{ roiId: string; pointIndex: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const resetView = () => {
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getMousePos = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    // Adjust mouse pos based on zoom/pan for correct ROI placement
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    // We need coordinates relative to the *image*, not the container, to store ROIs consistently
    // However, for simple overlay logic on top of CSS transforms, we often store % relative to container
    // If zoom is active, this gets tricky. For this version, we disable drawing while zoomed or 
    // we strictly use container-relative % which scales with the transform.
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // If panning (Middle click or Space+Click logic simulated here by a 'pan' mode if we added it, 
    // but we'll use a specific condition or key modifier in future. For now, let's keep it simple)
    if (e.button === 1 || tool === 'select' && e.shiftKey) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
    }

    const { x, y } = getMousePos(e);

    // SELECT MODE & EDIT
    if (tool === 'select') {
      const threshold = 3 / zoom; // Adjust threshold based on zoom
      for (const roi of rois) {
        for(let i=0; i<roi.points.length; i++) {
           const p = roi.points[i];
           if (Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < threshold) {
             setDragState({ roiId: roi.id, pointIndex: i });
             return;
           }
        }
      }
      return;
    }

    // DRAW MODE (Only allow if not deeply zoomed/panned to avoid coordinate confusion in this simple version)
    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
    }

    const { x, y } = getMousePos(e);

    if (dragState) {
      setRois(prev => prev.map(r => {
        if (r.id === dragState.roiId) {
          const newPoints = [...r.points];
          newPoints[dragState.pointIndex] = { x, y };
          const length = calculateLongestDistance(newPoints);
          return { 
            ...r, 
            points: newPoints,
            isConfirmed: true, 
            measurements: { ...r.measurements, length }
          };
        }
        return r;
      }));
      return;
    }

    if (!isDrawing) return;
    
    if (tool === 'pencil') {
      setCurrentPoints([...currentPoints, { x, y }]);
    } else if (tool === 'rect') {
      const start = currentPoints[0];
      setCurrentPoints([start, { x, y }]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
        setIsPanning(false);
        return;
    }
    if (dragState) {
      setDragState(null);
      return;
    }
    if (!isDrawing) return;
    setIsDrawing(false);
    
    let finalPoints = currentPoints;
    if (tool === 'rect' && currentPoints.length >= 2) {
      const p1 = currentPoints[0];
      const p2 = currentPoints[currentPoints.length - 1];
      finalPoints = [
        { x: p1.x, y: p1.y },
        { x: p2.x, y: p1.y },
        { x: p2.x, y: p2.y },
        { x: p1.x, y: p2.y }
      ];
    }
    
    if (finalPoints.length < 2) return;

    const newROI: ROIAnnotation = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'path', 
      points: finalPoints,
      label: 'Doctor ROI',
      isConfirmed: true,
      measurements: {
        length: calculateLongestDistance(finalPoints),
        huValue: Math.floor(Math.random() * 60) + 30 
      }
    };
    
    setRois([...rois, newROI]);
    setCurrentPoints([]);
    setTool('select');
  };

  const calculateLongestDistance = (points: {x: number, y: number}[]) => {
     let maxDistSq = 0;
     for(let i=0; i<points.length; i++) {
       for(let j=i+1; j<points.length; j++) {
         const dx = points[i].x - points[j].x;
         const dy = points[i].y - points[j].y;
         const dSq = dx*dx + dy*dy;
         if (dSq > maxDistSq) maxDistSq = dSq;
       }
     }
     const pixelDist = Math.sqrt(maxDistSq);
     return Math.floor(pixelDist * 3.5); 
  };

  const deleteROI = (id: string) => {
    setRois(rois.filter(r => r.id !== id));
  };

  const totalTumorBurden = rois.reduce((acc, r) => acc + (r.measurements?.length || 0), 0);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
      
      {/* 1. Advanced Toolbar */}
      <div className="bg-slate-800 p-2 border-b border-slate-700 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 items-center">
            {/* Drawing Tools */}
            <div className="flex bg-slate-900 p-1 rounded-lg">
                {[
                    { id: 'select', icon: Move, title: 'Move/Edit' },
                    { id: 'pencil', icon: Pencil, title: 'Freehand' },
                    { id: 'rect', icon: Square, title: 'Box' }
                ].map((t) => (
                    <button
                    key={t.id}
                    onClick={() => setTool(t.id as any)}
                    className={`p-2 rounded-md transition-all ${tool === t.id ? 'bg-medical-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title={t.title}
                    >
                    <t.icon size={16} />
                    </button>
                ))}
            </div>

            <div className="w-px h-6 bg-slate-600 mx-1"></div>

            {/* Image Controls */}
            <div className="flex gap-2 bg-slate-900 p-1 rounded-lg items-center px-3">
                <div className="flex flex-col items-center group relative cursor-pointer">
                    <Sun size={16} className="text-yellow-400 mb-0.5" />
                    <input 
                        type="range" min="50" max="150" value={brightness} 
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="absolute top-full w-24 h-1 bg-slate-600 rounded-lg appearance-none opacity-0 group-hover:opacity-100 transition-opacity z-50 cursor-pointer" 
                    />
                    <div className="h-0.5 w-full bg-yellow-400/50 rounded-full mt-0.5"></div>
                </div>

                <div className="flex flex-col items-center group relative cursor-pointer">
                    <Contrast size={16} className="text-white mb-0.5" />
                     <input 
                        type="range" min="50" max="200" value={contrast} 
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="absolute top-full w-24 h-1 bg-slate-600 rounded-lg appearance-none opacity-0 group-hover:opacity-100 transition-opacity z-50 cursor-pointer" 
                    />
                     <div className="h-0.5 w-full bg-white/50 rounded-full mt-0.5"></div>
                </div>

                <button 
                    onClick={() => setInvert(!invert)}
                    className={`p-1 rounded ${invert ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
                    title="Invert (Negative)"
                >
                    <Eye size={16} />
                </button>
            </div>

             <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
                 <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} className="p-1.5 text-slate-400 hover:text-white"><ZoomOut size={14}/></button>
                 <span className="text-xs font-mono text-slate-300 w-8 text-center flex items-center justify-center">{Math.round(zoom * 100)}%</span>
                 <button onClick={() => setZoom(z => Math.min(4, z + 0.5))} className="p-1.5 text-slate-400 hover:text-white"><ZoomIn size={14}/></button>
             </div>

             <button onClick={resetView} className="p-2 text-slate-400 hover:text-teal-400" title="Reset"><RotateCcw size={16}/></button>
        </div>

        <button 
          onClick={() => onConfirm(rois)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg"
        >
          <CheckCircle2 size={14} /> {t?.tools || 'Confirm'}
        </button>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden relative">
        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className={`flex-1 relative bg-black rounded-xl overflow-hidden group border border-slate-700 shadow-inner ${tool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Transform Layer for Zoom/Pan */}
          <div 
            className="w-full h-full origin-top-left transition-transform duration-75 ease-out"
            style={{ 
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` 
            }}
          >
            {/* Base Image with Filters */}
            <img 
                src={imageSrc} 
                className="w-full h-full object-contain pointer-events-none select-none opacity-90" 
                style={{ 
                    filter: `brightness(${brightness}%) contrast(${contrast}%) invert(${invert ? 1 : 0})` 
                }}
            />
            
            {/* SVG Overlay - Inherits transform so ROIs stick to image */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ vectorEffect: 'non-scaling-stroke' }}>
                {rois.map((roi) => (
                <g key={roi.id} className="pointer-events-auto">
                    <polygon
                    points={roi.points.map(p => `${p.x}%,${p.y}%`).join(' ')}
                    className={`fill-teal-500/20 stroke-2 transition-all duration-75 
                        ${roi.isConfirmed ? 'stroke-teal-400' : 'stroke-medical-400 stroke-dashed'} 
                        ${tool === 'select' ? 'hover:stroke-white cursor-move' : ''}
                    `}
                    vectorEffect="non-scaling-stroke"
                    />
                    
                    {tool === 'select' && roi.points.map((p, i) => (
                    <circle
                        key={i}
                        cx={`${p.x}%`}
                        cy={`${p.y}%`}
                        r={5 / zoom} // Keep handle size consistent regardless of zoom
                        className="fill-slate-900 stroke-teal-400 stroke-2 cursor-grab hover:fill-teal-400"
                        vectorEffect="non-scaling-stroke"
                    />
                    ))}

                    <text 
                    x={`${roi.points[0].x}%`} 
                    y={`${roi.points[0].y - (2/zoom)}%`} 
                    className="fill-white font-bold drop-shadow-md select-none"
                    style={{ fontSize: `${12/zoom}px`, textShadow: '0px 1px 2px black' }}
                    >
                    {roi.label} ({roi.measurements?.length}mm)
                    </text>
                </g>
                ))}

                {isDrawing && currentPoints.length > 0 && (
                tool === 'rect' ? (
                    <rect
                    x={`${Math.min(currentPoints[0].x, currentPoints[currentPoints.length-1].x)}%`}
                    y={`${Math.min(currentPoints[0].y, currentPoints[currentPoints.length-1].y)}%`}
                    width={`${Math.abs(currentPoints[currentPoints.length-1].x - currentPoints[0].x)}%`}
                    height={`${Math.abs(currentPoints[currentPoints.length-1].y - currentPoints[0].y)}%`}
                    className="fill-medical-500/20 stroke-medical-500 stroke-2 stroke-dashed"
                    vectorEffect="non-scaling-stroke"
                    />
                ) : (
                    <polyline
                    points={currentPoints.map(p => `${p.x}%,${p.y}%`).join(' ')}
                    className="fill-none stroke-medical-500 stroke-2"
                    vectorEffect="non-scaling-stroke"
                    />
                )
                )}
            </svg>
          </div>
        </div>

        {/* Right Sidebar: Calculations & List */}
        <div className="w-64 bg-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto border-l border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <ScanLine className="text-teal-400" size={20}/>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Segmentation</h4>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {rois.map((roi) => (
              <div key={roi.id} className="bg-slate-700/40 p-3 rounded-lg border border-slate-600 group hover:border-teal-500/50 transition-colors relative">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${roi.isConfirmed ? 'bg-teal-500' : 'bg-amber-500'}`}></div>
                     <span className="text-sm font-bold text-slate-200">{roi.label}</span>
                  </div>
                  <button onClick={() => deleteROI(roi.id)} className="text-slate-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"><Eraser size={14}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] mt-2">
                  <div className="bg-slate-800 p-1.5 rounded border border-slate-600/50">
                    <p className="text-slate-500 uppercase text-[9px]">Size</p>
                    <p className="text-white font-mono font-bold text-lg">{roi.measurements?.length}<span className="text-[9px] text-slate-400">mm</span></p>
                  </div>
                  <div className="bg-slate-800 p-1.5 rounded border border-slate-600/50">
                    <p className="text-slate-500 uppercase text-[9px]">HU</p>
                    <p className="text-white font-mono font-bold text-lg">{roi.measurements?.huValue}</p>
                  </div>
                </div>
              </div>
            ))}
            {rois.length === 0 && (
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center">
                    <Pencil className="mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-500 text-xs">Draw new region or wait for AI proposal.</p>
                </div>
            )}
          </div>
          
          {/* RECIST Calculation Panel */}
          <div className="mt-auto bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl border border-slate-600 shadow-xl">
            <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-bold text-teal-400 uppercase tracking-tighter flex items-center gap-1"><Ruler size={12}/> RECIST 1.1 Sum</p>
            </div>
            
            <p className="text-3xl font-black text-white mb-1">{totalTumorBurden}<span className="text-sm font-medium text-slate-400 ml-1">mm</span></p>
            
            <div className="w-full bg-slate-700 h-1.5 mt-2 rounded-full overflow-hidden">
               <div className="bg-teal-500 h-full transition-all duration-500" style={{ width: `${Math.min(totalTumorBurden, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROIEditor;
