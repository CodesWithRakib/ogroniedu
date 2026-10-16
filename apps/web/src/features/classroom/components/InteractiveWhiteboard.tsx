'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle as CircleIcon,
  Minus,
  MoveUpRight,
  Type,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Grid,
  AlignJustify,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui';

export type WhiteboardTool =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'rect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text';

export type BackgroundMode = 'blackboard' | 'grid' | 'ruled';

interface ColorPreset {
  name: string;
  value: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Cyan', value: '#22D3EE' },
  { name: 'Emerald', value: '#34D399' },
  { name: 'Amber', value: '#FBBF24' },
  { name: 'Rose', value: '#FB7185' },
  { name: 'Violet', value: '#C084FC' },
  { name: 'Yellow', value: '#FACC15' },
];

const STROKE_SIZES = [
  { label: 'Fine (2px)', value: 2 },
  { label: 'Normal (4px)', value: 4 },
  { label: 'Bold (8px)', value: 8 },
  { label: 'Marker (14px)', value: 14 },
];

interface InteractiveWhiteboardProps {
  locale?: 'bn' | 'en';
  sessionTitle?: string;
}

export function InteractiveWhiteboard({
  locale = 'bn',
  sessionTitle = 'Classroom Session',
}: InteractiveWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen');
  const [strokeColor, setStrokeColor] = useState<string>('#22D3EE');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');

  // Undo / Redo history
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Drawing state
  const isDrawingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const snapshotRef = useRef<ImageData | null>(null);

  // Update undo/redo availability buttons
  const updateHistoryButtons = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Save state to undo history
  const pushToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Discard any redo states ahead of current index
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(imgData);
    if (historyRef.current.length > 30) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
    updateHistoryButtons();
  }, [updateHistoryButtons]);

  // Render Background Pattern
  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, mode: BackgroundMode) => {
      ctx.save();
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, width, height);

      if (mode === 'grid') {
        // Math grid - 28px square spacing
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        const step = 28;
        ctx.beginPath();
        for (let x = step; x < width; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = step; y < height; y += step) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Accent major grid lines every 140px
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = step * 5; x < width; x += step * 5) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = step * 5; y < height; y += step * 5) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      } else if (mode === 'ruled') {
        // Ruled sheet for Bangla/English handwriting
        const lineSpacing = 36;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 60; y < height; y += lineSpacing) {
          ctx.moveTo(40, y);
          ctx.lineTo(width - 40, y);
        }
        ctx.stroke();

        // Left margin rule (Red/Rose line)
        ctx.strokeStyle = 'rgba(251, 113, 133, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.lineTo(40, height);
        ctx.stroke();
      }
      ctx.restore();
    },
    [],
  );

  // Initialize Canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, 640);
    const height = Math.max(rect.height, 560);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    drawBackground(ctx, width, height, backgroundMode);

    historyRef.current = [];
    historyIndexRef.current = -1;
    pushToHistory();
  }, [backgroundMode, drawBackground, pushToHistory]);

  useEffect(() => {
    initCanvas();
    const handleResize = () => {
      // Keep canvas drawings during window resize if possible
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  // Handle switching background mode
  const handleChangeBackground = (mode: BackgroundMode) => {
    setBackgroundMode(mode);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = parseFloat(canvas.style.width);
    const height = parseFloat(canvas.style.height);

    // Save user's drawings
    const currentDrawing = ctx.getImageData(0, 0, canvas.width, canvas.height);
    drawBackground(ctx, width, height, mode);

    // Reapply drawing on top
    ctx.putImageData(currentDrawing, 0, 0);
  };

  // Coordinates helper
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  // Configure context for active tool
  const setupContext = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#090D16'; // background eraser color
      ctx.lineWidth = strokeWidth * 3;
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor + '44'; // 25% opacity
      ctx.lineWidth = strokeWidth * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
    }
  };

  // Draw Arrow Helper
  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headlen = 14;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  // Start Drawing
  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool === 'text') {
      const pos = getCoordinates(e);
      setTextInputPos(pos);
      setTextInputVisible(true);
      setTextInputValue('');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const pos = getCoordinates(e);
    startPosRef.current = pos;

    // Snapshot before starting shape/stroke
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    setupContext(ctx);
    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  // Move Drawing
  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPos = getCoordinates(e);

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    } else {
      // For geometric shapes, restore snapshot then draw live preview
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      setupContext(ctx);

      const start = startPosRef.current;
      if (activeTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        drawArrow(ctx, start.x, start.y, currentPos.x, currentPos.y);
      } else if (activeTool === 'rect') {
        const width = currentPos.x - start.x;
        const height = currentPos.y - start.y;
        ctx.strokeRect(start.x, start.y, width, height);
      } else if (activeTool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(currentPos.x - start.x, 2) + Math.pow(currentPos.y - start.y, 2),
        );
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  // End Drawing
  const handleEnd = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    pushToHistory();
  };

  // Add text to canvas
  const handleApplyText = () => {
    if (!textInputValue.trim()) {
      setTextInputVisible(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.font = 'bold 20px "Hind Siliguri", "Outfit", sans-serif';
    ctx.fillStyle = strokeColor;
    ctx.fillText(textInputValue, textInputPos.x, textInputPos.y + 16);
    ctx.restore();

    setTextInputVisible(false);
    setTextInputValue('');
    pushToHistory();
  };

  // Undo
  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      updateHistoryButtons();
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      updateHistoryButtons();
    }
  };

  // Clear Canvas
  const handleClear = () => {
    const confirmMsg =
      locale === 'bn'
        ? 'আপনি কি নিশ্চিত যে সম্পূর্ণ হোয়াইটবোর্ড মুছে ফেলতে চান?'
        : 'Are you sure you want to clear the entire whiteboard?';
    if (window.confirm(confirmMsg)) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const width = parseFloat(canvas.style.width);
      const height = parseFloat(canvas.style.height);
      drawBackground(ctx, width, height, backgroundMode);
      pushToHistory();
    }
  };

  // Export as PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const safeTitle = sessionTitle.replace(/\s+/g, '-').toLowerCase();
    link.download = `ogroniedu-notes-${safeTitle}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-[#060A12] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'p-4 h-screen w-screen rounded-none' : 'h-[680px]'
      }`}
      data-testid="interactive-whiteboard"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-slate-200 z-10 backdrop-blur-md">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'pen'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={locale === 'bn' ? 'কলম (Pen)' : 'Pen'}
            data-testid="wb-tool-pen"
          >
            <Pen className="w-4 h-4" />
            <span className="hidden sm:inline">{locale === 'bn' ? 'কলম' : 'Pen'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'highlighter'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={locale === 'bn' ? 'হাইলাইটার' : 'Highlighter'}
            data-testid="wb-tool-highlighter"
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden sm:inline">{locale === 'bn' ? 'হাইলাইটার' : 'Highlight'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'eraser'
                ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={locale === 'bn' ? 'রাবার (Eraser)' : 'Eraser'}
            data-testid="wb-tool-eraser"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">{locale === 'bn' ? 'মুছুন' : 'Eraser'}</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          {/* Shapes */}
          <button
            type="button"
            onClick={() => setActiveTool('line')}
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'line'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={locale === 'bn' ? 'সোজা রেখা' : 'Line'}
            data-testid="wb-tool-line"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('arrow')}
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'arrow'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={locale === 'bn' ? 'তীরচিহ্ন (Vector Arrow)' : 'Arrow'}
            data-testid="wb-tool-arrow"
          >
            <MoveUpRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('rect')}
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'rect'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={locale === 'bn' ? 'আয়তক্ষেত্র (Rectangle)' : 'Rectangle'}
            data-testid="wb-tool-rect"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('circle')}
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'circle'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={locale === 'bn' ? 'বৃত্ত (Circle)' : 'Circle'}
            data-testid="wb-tool-circle"
          >
            <CircleIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'text'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={locale === 'bn' ? 'টেক্সট লিখুন' : 'Text'}
            data-testid="wb-tool-text"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setStrokeColor(color.value)}
              className="w-5 h-5 rounded-full transition-transform hover:scale-110 flex items-center justify-center relative"
              style={{ backgroundColor: color.value }}
              title={color.name}
              data-testid={`wb-color-${color.name.toLowerCase()}`}
            >
              {strokeColor === color.value && (
                <Check className={`w-3 h-3 ${color.value === '#FFFFFF' ? 'text-black' : 'text-white'}`} />
              )}
            </button>
          ))}
        </div>

        {/* Stroke Width Selector */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs">
          {STROKE_SIZES.map((sz) => (
            <button
              key={sz.value}
              type="button"
              onClick={() => setStrokeWidth(sz.value)}
              className={`px-2 py-1 rounded-xl font-bold transition-all ${
                strokeWidth === sz.value
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sz.value}px
            </button>
          ))}
        </div>

        {/* Background, Undo, Redo, Export & Fullscreen */}
        <div className="flex items-center gap-1.5">
          {/* Background Toggle */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleChangeBackground('grid')}
              className={`p-1.5 rounded-xl transition-all ${
                backgroundMode === 'grid'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={locale === 'bn' ? 'ছক কাগজ (Math Grid)' : 'Math Grid'}
              data-testid="wb-bg-grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleChangeBackground('ruled')}
              className={`p-1.5 rounded-xl transition-all ${
                backgroundMode === 'ruled'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={locale === 'bn' ? 'দাগ টানা কাগজ (Ruled Lines)' : 'Ruled Lines'}
              data-testid="wb-bg-ruled"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleChangeBackground('blackboard')}
              className={`p-1.5 rounded-xl transition-all ${
                backgroundMode === 'blackboard'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={locale === 'bn' ? 'কালো বোর্ড (Plain Board)' : 'Plain Board'}
              data-testid="wb-bg-plain"
            >
              <div className="w-4 h-4 rounded-sm bg-slate-800 border border-slate-600" />
            </button>
          </div>

          {/* Undo & Redo */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
              title={locale === 'bn' ? 'পূর্বাবস্থায় ফিরুন (Undo)' : 'Undo'}
              data-testid="wb-btn-undo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
              title={locale === 'bn' ? 'পুনরায় করুন (Redo)' : 'Redo'}
              data-testid="wb-btn-redo"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
            title={locale === 'bn' ? 'সম্পূর্ণ পরিষ্কার করুন' : 'Clear Board'}
            data-testid="wb-btn-clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Download PNG */}
          <button
            type="button"
            onClick={handleExportPNG}
            className="p-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1.5 text-xs font-bold"
            title={locale === 'bn' ? 'নোট ডাউনলোড করুন (PNG)' : 'Export PNG Notes'}
            data-testid="wb-btn-export"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">{locale === 'bn' ? 'ডাউনলোড' : 'Save'}</span>
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title={locale === 'bn' ? 'ফুলস্ক্রিন' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="absolute inset-0 block touch-none"
        />

        {/* Text Input Modal on Canvas */}
        {textInputVisible && (
          <div
            className="absolute z-20 bg-slate-900 border border-cyan-400/50 p-2.5 rounded-2xl shadow-2xl flex items-center gap-2"
            style={{ left: Math.min(textInputPos.x, 300), top: Math.min(textInputPos.y, 400) }}
          >
            <input
              type="text"
              autoFocus
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyText();
                if (e.key === 'Escape') setTextInputVisible(false);
              }}
              placeholder={locale === 'bn' ? 'এখানে লিখুন...' : 'Type note text...'}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              data-testid="wb-text-input"
            />
            <Button
              size="sm"
              onClick={handleApplyText}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-8 px-3 rounded-xl"
            >
              {locale === 'bn' ? 'যুক্ত করুন' : 'Add'}
            </Button>
          </div>
        )}

        {/* Watermark in bottom corner */}
        <div className="absolute bottom-3 right-4 pointer-events-none flex items-center gap-2 text-[11px] font-semibold text-slate-500/60 select-none">
          <span>OgroniEdu Interactive Whiteboard</span>
          <span>•</span>
          <span className="capitalize">{backgroundMode}</span>
        </div>
      </div>
    </div>
  );
}
