import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapData } from '../types';
import { X, ZoomIn, ZoomOut, Move, Maximize, Minimize, CloudRain, Eraser, RefreshCw, Compass, Eye, EyeOff, ChevronUp, ChevronDown, Undo2, Redo2, Flame, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { WeatherOverlay, WeatherType } from './WeatherOverlay';

interface MapViewerProps {
  map: MapData;
  onClose: () => void;
}

type RevealMode = 'brush' | 'box';

interface CanvasPoint {
  x: number;
  y: number;
}

interface TorchLight {
  id: string;
  x: number;
  y: number;
  radius: number;
  intensity: number;
  flicker: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const MIN_BRUSH_SIZE = 15;
const MAX_BRUSH_SIZE = 180;
const MIN_BOX_SOFTNESS = 0;
const MAX_BOX_SOFTNESS = 60;
const MAX_FOG_HISTORY = 25;
const MIN_TORCH_RADIUS = 50;
const MAX_TORCH_RADIUS = 420;
const MIN_TORCH_INTENSITY = 0.25;
const MAX_TORCH_INTENSITY = 1;
const MIN_DARKNESS_LEVEL = 0.2;
const MAX_DARKNESS_LEVEL = 0.98;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const MapViewer: React.FC<MapViewerProps> = ({ map, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [weather, setWeather] = useState<WeatherType>('none');
  const [isErasingFoW, setIsErasingFoW] = useState(false);
  const [showFoW, setShowFoW] = useState(true);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isProjectionMode, setIsProjectionMode] = useState(false);
  const [brushSize, setBrushSize] = useState(55);
  const [isDrawingFoW, setIsDrawingFoW] = useState(false);
  const [revealMode, setRevealMode] = useState<RevealMode>('brush');
  const [selectionStart, setSelectionStart] = useState<CanvasPoint | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<CanvasPoint | null>(null);
  const [boxSoftness, setBoxSoftness] = useState(24);
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });
  const [showTorches, setShowTorches] = useState(false);
  const [isTorchEditMode, setIsTorchEditMode] = useState(false);
  const [torchDarkness, setTorchDarkness] = useState(0.82);
  const [torchRadiusControl, setTorchRadiusControl] = useState(170);
  const [torchIntensityControl, setTorchIntensityControl] = useState(0.8);
  const [torches, setTorches] = useState<TorchLight[]>([]);
  const [selectedTorchId, setSelectedTorchId] = useState<string | null>(null);
  const [draggingTorchId, setDraggingTorchId] = useState<string | null>(null);
  const [showFogPanel, setShowFogPanel] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fowCanvasRef = useRef<HTMLCanvasElement>(null);
  const torchCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const actionStartSnapshotRef = useRef<string | null>(null);
  const fogStorageKey = `dragonbane-fow:${map.id}`;
  const torchStorageKey = `dragonbane-torches:${map.id}`;

  const fillFog = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const saveFoW = useCallback(() => {
    const canvas = fowCanvasRef.current;
    if (!canvas) return;

    try {
      localStorage.setItem(fogStorageKey, canvas.toDataURL('image/png'));
    } catch (error) {
      console.warn('Unable to persist fog data for this map:', error);
    }
  }, [fogStorageKey]);

  const syncHistoryCounts = useCallback(() => {
    setHistoryCounts({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
  }, []);

  const getFogSnapshot = useCallback(() => {
    const canvas = fowCanvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
    return canvas.toDataURL('image/png');
  }, []);

  const applyFogSnapshot = useCallback((snapshot: string, onApplied?: () => void) => {
    const canvas = fowCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const snapshotImage = new Image();
    snapshotImage.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(snapshotImage, 0, 0, canvas.width, canvas.height);
      onApplied?.();
    };
    snapshotImage.src = snapshot;
  }, []);

  const resetFogHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    actionStartSnapshotRef.current = null;
    syncHistoryCounts();
  }, [syncHistoryCounts]);

  const pushHistoryEntry = useCallback((beforeSnapshot: string | null) => {
    const afterSnapshot = getFogSnapshot();
    if (!beforeSnapshot || !afterSnapshot || beforeSnapshot === afterSnapshot) return;

    undoStackRef.current.push(beforeSnapshot);
    if (undoStackRef.current.length > MAX_FOG_HISTORY) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    syncHistoryCounts();
  }, [getFogSnapshot, syncHistoryCounts]);

  const undoFog = useCallback(() => {
    const previousSnapshot = undoStackRef.current.pop();
    const currentSnapshot = getFogSnapshot();
    if (!previousSnapshot || !currentSnapshot) {
      syncHistoryCounts();
      return;
    }

    redoStackRef.current.push(currentSnapshot);
    applyFogSnapshot(previousSnapshot, () => {
      saveFoW();
      syncHistoryCounts();
    });
  }, [applyFogSnapshot, getFogSnapshot, saveFoW, syncHistoryCounts]);

  const redoFog = useCallback(() => {
    const nextSnapshot = redoStackRef.current.pop();
    const currentSnapshot = getFogSnapshot();
    if (!nextSnapshot || !currentSnapshot) {
      syncHistoryCounts();
      return;
    }

    undoStackRef.current.push(currentSnapshot);
    applyFogSnapshot(nextSnapshot, () => {
      saveFoW();
      syncHistoryCounts();
    });
  }, [applyFogSnapshot, getFogSnapshot, saveFoW, syncHistoryCounts]);

  const initFoW = useCallback(() => {
    const canvas = fowCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    resetFogHistory();

    const torchCanvas = torchCanvasRef.current;
    if (torchCanvas) {
      torchCanvas.width = canvas.width;
      torchCanvas.height = canvas.height;
    }

    const savedFog = localStorage.getItem(fogStorageKey);
    if (!savedFog) {
      fillFog(ctx, canvas);
      return;
    }

    const fogImage = new Image();
    fogImage.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(fogImage, 0, 0, canvas.width, canvas.height);
    };
    fogImage.onerror = () => {
      fillFog(ctx, canvas);
    };
    fogImage.src = savedFog;
  }, [fillFog, fogStorageKey, resetFogHistory]);

  useEffect(() => {
    const torchCanvas = torchCanvasRef.current;
    const img = imageRef.current;
    if (!torchCanvas || !img) return;

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return;

    torchCanvas.width = width;
    torchCanvas.height = height;
  }, [showTorches, map.id]);

  const restoreFoW = useCallback(() => {
    const canvas = fowCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const beforeSnapshot = getFogSnapshot();
    fillFog(ctx, canvas);
    pushHistoryEntry(beforeSnapshot);
    saveFoW();
  }, [fillFog, getFogSnapshot, pushHistoryEntry, saveFoW]);

  useEffect(() => {
    setShowTorches(false);
    setIsTorchEditMode(false);
    setSelectedTorchId(null);
    setDraggingTorchId(null);
    setTorchDarkness(0.82);
    setTorchRadiusControl(170);
    setTorchIntensityControl(0.8);
    setTorches([]);

    const stored = localStorage.getItem(torchStorageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        showTorches?: boolean;
        torchDarkness?: number;
        torchRadiusControl?: number;
        torchIntensityControl?: number;
        torches?: TorchLight[];
      };

      const cleanedTorches = Array.isArray(parsed.torches)
        ? parsed.torches
          .filter((torch) =>
            torch &&
            typeof torch.id === 'string' &&
            Number.isFinite(torch.x) &&
            Number.isFinite(torch.y)
          )
          .map((torch) => ({
            id: torch.id,
            x: torch.x,
            y: torch.y,
            radius: clamp(Number(torch.radius) || 170, MIN_TORCH_RADIUS, MAX_TORCH_RADIUS),
            intensity: clamp(Number(torch.intensity) || 0.8, MIN_TORCH_INTENSITY, MAX_TORCH_INTENSITY),
            flicker: clamp(Number(torch.flicker) || 0.08, 0, 0.25),
          }))
        : [];

      setShowTorches(Boolean(parsed.showTorches));
      setTorchDarkness(clamp(Number(parsed.torchDarkness) || 0.82, MIN_DARKNESS_LEVEL, MAX_DARKNESS_LEVEL));
      setTorchRadiusControl(clamp(Number(parsed.torchRadiusControl) || 170, MIN_TORCH_RADIUS, MAX_TORCH_RADIUS));
      setTorchIntensityControl(clamp(Number(parsed.torchIntensityControl) || 0.8, MIN_TORCH_INTENSITY, MAX_TORCH_INTENSITY));
      setTorches(cleanedTorches);
    } catch (error) {
      console.warn('Unable to read torch data for this map:', error);
    }
  }, [torchStorageKey]);

  useEffect(() => {
    const payload = {
      showTorches,
      torchDarkness,
      torchRadiusControl,
      torchIntensityControl,
      torches,
    };
    localStorage.setItem(torchStorageKey, JSON.stringify(payload));
  }, [showTorches, torchDarkness, torchRadiusControl, torchIntensityControl, torches, torchStorageKey]);

  useEffect(() => {
    if (selectedTorchId && !torches.some((torch) => torch.id === selectedTorchId)) {
      setSelectedTorchId(null);
    }
  }, [selectedTorchId, torches]);

  useEffect(() => {
    if (!selectedTorchId) return;
    const selectedTorch = torches.find((torch) => torch.id === selectedTorchId);
    if (!selectedTorch) return;
    setTorchRadiusControl(selectedTorch.radius);
    setTorchIntensityControl(selectedTorch.intensity);
  }, [selectedTorchId, torches]);

  const removeSelectedTorch = useCallback(() => {
    if (!selectedTorchId) return;
    setTorches((prev) => prev.filter((torch) => torch.id !== selectedTorchId));
    setSelectedTorchId(null);
    setDraggingTorchId(null);
  }, [selectedTorchId]);

  const updateTorchPosition = useCallback((id: string, x: number, y: number) => {
    setTorches((prev) =>
      prev.map((torch) => (torch.id === id ? { ...torch, x, y } : torch))
    );
  }, []);

  const createTorchAtPoint = useCallback((x: number, y: number) => {
    const torch: TorchLight = {
      id: `torch-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      x,
      y,
      radius: clamp(torchRadiusControl, MIN_TORCH_RADIUS, MAX_TORCH_RADIUS),
      intensity: clamp(torchIntensityControl, MIN_TORCH_INTENSITY, MAX_TORCH_INTENSITY),
      flicker: 0.08,
    };
    setTorches((prev) => [...prev, torch]);
    setSelectedTorchId(torch.id);
    return torch.id;
  }, [torchIntensityControl, torchRadiusControl]);

  const findTorchAtPoint = useCallback((x: number, y: number) => {
    for (let index = torches.length - 1; index >= 0; index -= 1) {
      const torch = torches[index];
      const distance = Math.hypot(torch.x - x, torch.y - y);
      if (distance <= Math.max(22, torch.radius * 0.2)) {
        return torch.id;
      }
    }
    return null;
  }, [torches]);

  useEffect(() => {
    const canvas = torchCanvasRef.current;
    if (!canvas) return;

    let animationFrame = 0;
    const renderLighting = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrame = requestAnimationFrame(renderLighting);
        return;
      }

      const fogCanvas = fowCanvasRef.current;
      if (fogCanvas && (canvas.width !== fogCanvas.width || canvas.height !== fogCanvas.height)) {
        canvas.width = fogCanvas.width;
        canvas.height = fogCanvas.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (showTorches && canvas.width > 0 && canvas.height > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${torchDarkness})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (torches.length > 0) {
          ctx.globalCompositeOperation = 'destination-out';

          const time = performance.now() * 0.004;
          torches.forEach((torch, index) => {
            const flickerOffset = Math.sin(time * (1.5 + index * 0.11) + index * 1.7) * torch.flicker;
            const radius = torch.radius * (1 + flickerOffset);
            const gradient = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, radius);
            gradient.addColorStop(0, `rgba(255, 231, 176, ${0.95 * torch.intensity})`);
            gradient.addColorStop(0.35, `rgba(255, 176, 87, ${0.55 * torch.intensity})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(torch.x, torch.y, radius, 0, Math.PI * 2);
            ctx.fill();
          });

          // Render a subtle warm glow on top so torches remain visible over fog and dark maps.
          ctx.globalCompositeOperation = 'source-over';
          torches.forEach((torch, index) => {
            const pulse = 1 + Math.sin(time * (1.9 + index * 0.2) + index) * 0.08;
            const glowRadius = torch.radius * 0.35 * pulse;
            const glow = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, glowRadius);
            glow.addColorStop(0, `rgba(255, 196, 115, ${0.30 * torch.intensity})`);
            glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(torch.x, torch.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      animationFrame = requestAnimationFrame(renderLighting);
    };

    animationFrame = requestAnimationFrame(renderLighting);
    return () => cancelAnimationFrame(animationFrame);
  }, [showTorches, torchDarkness, torches]);

  const fitMapToView = useCallback(() => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;

    const imageWidth = img.naturalWidth || img.width;
    const imageHeight = img.naturalHeight || img.height;
    if (!imageWidth || !imageHeight) return;

    const fitScale = Math.min(
      (container.clientWidth * 0.95) / imageWidth,
      (container.clientHeight * 0.95) / imageHeight
    );

    setScale(clamp(fitScale, MIN_SCALE, MAX_SCALE));
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setScale((prev) => clamp(prev + delta, MIN_SCALE, MAX_SCALE));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isProjectionMode || document.fullscreenElement) return;

    viewerRef.current?.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  }, [isProjectionMode]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      return;
    }

    document.exitFullscreen();
  }, []);

  const toggleProjectionMode = useCallback(() => {
    setIsProjectionMode((prev) => {
      const next = !prev;
      setIsToolbarVisible(!next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (isErasingFoW) return;
    setIsDrawingFoW(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    actionStartSnapshotRef.current = null;
  }, [isErasingFoW]);

  useEffect(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsDrawingFoW(false);
    actionStartSnapshotRef.current = null;
  }, [revealMode]);

  useEffect(() => {
    if (showTorches) return;
    setIsTorchEditMode(false);
    setSelectedTorchId(null);
    setDraggingTorchId(null);
  }, [showTorches]);

  useEffect(() => {
    if (isToolbarVisible && !isProjectionMode) return;
    setShowFogPanel(false);
  }, [isProjectionMode, isToolbarVisible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const key = e.key.toLowerCase();
      const hasModifier = e.metaKey || e.ctrlKey;

      if (hasModifier && key === 'z' && e.shiftKey) {
        e.preventDefault();
        redoFog();
      } else if (hasModifier && key === 'z') {
        e.preventDefault();
        undoFog();
      } else if (hasModifier && key === 'y') {
        e.preventDefault();
        redoFog();
      } else if (key === 'h') {
        setIsToolbarVisible((prev) => !prev);
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === 'p') {
        e.preventDefault();
        toggleProjectionMode();
      } else if (key === 'e') {
        e.preventDefault();
        setShowFogPanel(false);
        setIsTorchEditMode(false);
        setIsErasingFoW((prev) => !prev);
      } else if (key === 'b') {
        e.preventDefault();
        setRevealMode((prev) => (prev === 'brush' ? 'box' : 'brush'));
      } else if (key === 't') {
        e.preventDefault();
        setShowTorches((prev) => {
          const next = !prev;
          if (!next) {
            setIsTorchEditMode(false);
            setSelectedTorchId(null);
            setDraggingTorchId(null);
          } else if (torches.length === 0) {
            setIsTorchEditMode(true);
          }
          return next;
        });
      } else if (key === 'l') {
        e.preventDefault();
        setShowTorches(true);
        setShowFogPanel(false);
        setIsErasingFoW(false);
        setIsTorchEditMode((prev) => !prev);
      } else if ((key === 'backspace' || key === 'delete') && isTorchEditMode && selectedTorchId) {
        e.preventDefault();
        removeSelectedTorch();
      } else if (key === 'r') {
        e.preventDefault();
        restoreFoW();
      } else if (e.key === '[') {
        e.preventDefault();
        setBrushSize((prev) => clamp(prev - 5, MIN_BRUSH_SIZE, MAX_BRUSH_SIZE));
      } else if (e.key === ']') {
        e.preventDefault();
        setBrushSize((prev) => clamp(prev + 5, MIN_BRUSH_SIZE, MAX_BRUSH_SIZE));
      } else if (e.key === '0') {
        e.preventDefault();
        fitMapToView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitMapToView, isTorchEditMode, redoFog, removeSelectedTorch, restoreFoW, selectedTorchId, toggleFullscreen, toggleProjectionMode, torches.length, undoFog]);

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = fowCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: clamp((clientX - rect.left) * scaleX, 0, canvas.width),
      y: clamp((clientY - rect.top) * scaleY, 0, canvas.height),
      scaleX,
      scaleY,
    };
  };

  const eraseFoWAtPoint = (x: number, y: number, scaleX: number, scaleY: number) => {
    const canvas = fowCanvasRef.current;
    if (!canvas) return;

    const radius = brushSize * ((scaleX + scaleY) / 2);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    ctx.fill();
  };

  const eraseFoWByBrush = (e: React.PointerEvent<HTMLDivElement>) => {
    const coordinates = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coordinates) return;
    eraseFoWAtPoint(coordinates.x, coordinates.y, coordinates.scaleX, coordinates.scaleY);
  };

  const revealFoWSelection = () => {
    const canvas = fowCanvasRef.current;
    if (!canvas || !selectionStart || !selectionEnd) return;

    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.max(1, Math.abs(selectionStart.x - selectionEnd.x));
    const height = Math.max(1, Math.abs(selectionStart.y - selectionEnd.y));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const softness = Math.min(boxSoftness, width / 2, height / 2);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    if (softness <= 0) {
      ctx.fillRect(x, y, width, height);
      ctx.restore();
      return;
    }

    const innerX = x + softness;
    const innerY = y + softness;
    const innerWidth = Math.max(1, width - softness * 2);
    const innerHeight = Math.max(1, height - softness * 2);
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight);
    ctx.filter = `blur(${softness}px)`;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showTorches && isTorchEditMode) {
      const coordinates = getCanvasCoordinates(e.clientX, e.clientY);
      if (!coordinates) return;

      const existingTorchId = findTorchAtPoint(coordinates.x, coordinates.y);
      const torchId = existingTorchId ?? createTorchAtPoint(coordinates.x, coordinates.y);
      setSelectedTorchId(torchId);
      setDraggingTorchId(torchId);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (isErasingFoW) {
      if (revealMode === 'box') {
        const coordinates = getCanvasCoordinates(e.clientX, e.clientY);
        if (!coordinates) return;
        actionStartSnapshotRef.current = getFogSnapshot();
        const point = { x: coordinates.x, y: coordinates.y };
        setSelectionStart(point);
        setSelectionEnd(point);
      } else {
        const coordinates = getCanvasCoordinates(e.clientX, e.clientY);
        if (!coordinates) return;
        actionStartSnapshotRef.current = getFogSnapshot();
        eraseFoWAtPoint(coordinates.x, coordinates.y, coordinates.scaleX, coordinates.scaleY);
      }
      setIsDrawingFoW(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showTorches && isTorchEditMode && draggingTorchId) {
      const coordinates = getCanvasCoordinates(e.clientX, e.clientY);
      if (!coordinates) return;
      updateTorchPosition(draggingTorchId, coordinates.x, coordinates.y);
      return;
    }

    if (isErasingFoW && isDrawingFoW) {
      if (revealMode === 'box') {
        const coordinates = getCanvasCoordinates(e.clientX, e.clientY);
        if (coordinates) {
          setSelectionEnd({ x: coordinates.x, y: coordinates.y });
        }
      } else {
        eraseFoWByBrush(e);
      }
      return;
    }

    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (showTorches && isTorchEditMode) {
      setDraggingTorchId(null);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      return;
    }

    const shouldPersistFog = isErasingFoW && isDrawingFoW;

    if (shouldPersistFog && revealMode === 'box') {
      revealFoWSelection();
    }

    setIsDragging(false);
    setIsDrawingFoW(false);
    setSelectionStart(null);
    setSelectionEnd(null);

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (shouldPersistFog) {
      pushHistoryEntry(actionStartSnapshotRef.current);
      saveFoW();
    }
    actionStartSnapshotRef.current = null;
  };

  const selectionPreviewStyle = (() => {
    if (!isErasingFoW || revealMode !== 'box' || !selectionStart || !selectionEnd) return null;
    const canvas = fowCanvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;

    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionStart.x - selectionEnd.x);
    const height = Math.abs(selectionStart.y - selectionEnd.y);

    return {
      left: `${(x / canvas.width) * 100}%`,
      top: `${(y / canvas.height) * 100}%`,
      width: `${(width / canvas.width) * 100}%`,
      height: `${(height / canvas.height) * 100}%`,
    };
  })();

  const torchOverlayData = (() => {
    if (!showTorches || !isTorchEditMode) return [];
    const canvas = torchCanvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return [];

    return torches.map((torch) => ({
      ...torch,
      leftPercent: (torch.x / canvas.width) * 100,
      topPercent: (torch.y / canvas.height) * 100,
      radiusPercentX: (torch.radius / canvas.width) * 100,
      radiusPercentY: (torch.radius / canvas.height) * 100,
    }));
  })();

  return (
    <div ref={viewerRef} className="fixed inset-0 z-50 bg-[#080706] flex flex-col h-screen overflow-hidden font-sans">
      {!isProjectionMode && (
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-transparent to-stone-950/40 pointer-events-none z-10" />
      )}

      {!isToolbarVisible && !isProjectionMode && (
        <button
          onClick={() => setIsToolbarVisible(true)}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-50 px-6 py-2 bg-stone-900/40 backdrop-blur-md border-b border-x border-stone-800/50 rounded-b-xl text-stone-500 hover:text-emerald-400 hover:bg-stone-900/60 transition-all duration-300 group shadow-lg"
          title="Restore Command Center (H)"
        >
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </button>
      )}

      <div
        className={`absolute top-6 left-1/2 -translate-x-1/2 z-40 w-[min(95vw,980px)] px-2 py-1.5 bg-stone-900/40 backdrop-blur-xl border border-stone-800/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-wrap items-center justify-center gap-1.5 transition-all duration-500 hover:bg-stone-900/60 hover:border-emerald-500/30
          ${isToolbarVisible && !isProjectionMode ? 'translate-y-0 opacity-100' : '-translate-y-32 opacity-0 pointer-events-none'}
        `}
      >
        <div className="flex items-center gap-1.5 px-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            icon={<X className="w-4 h-4" />}
            className="rounded-xl hover:bg-red-950/30 hover:text-red-400"
            title="Close Atlas"
          />
          <h2 className="hidden lg:block text-xs font-display font-black text-stone-300 uppercase tracking-widest px-2 truncate max-w-[140px]">
            {map.name}
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-stone-950/40 p-1 rounded-xl border border-white/5">
          <Button size="sm" variant="ghost" onClick={() => setScale((s) => clamp(s + 0.1, MIN_SCALE, MAX_SCALE))} icon={<ZoomIn className="w-4 h-4" />} className="rounded-lg" />
          <div className="w-12 text-center text-[10px] font-mono font-bold text-emerald-500/80 bg-stone-950/60 py-1 rounded-md border border-white/5">
            {Math.round(scale * 100)}%
          </div>
          <Button size="sm" variant="ghost" onClick={() => setScale((s) => clamp(s - 0.1, MIN_SCALE, MAX_SCALE))} icon={<ZoomOut className="w-4 h-4" />} className="rounded-lg" />
          <Button size="sm" variant="ghost" onClick={() => setPosition({ x: 0, y: 0 })} title="Reset Pan" icon={<Move className="w-4 h-4 text-stone-500" />} className="rounded-lg ml-1" />
          <Button size="sm" variant="ghost" onClick={fitMapToView} className="rounded-lg px-2" title="Fit to View (0)">Fit</Button>
        </div>

        <div className="flex items-center gap-1 bg-stone-950/40 p-1 rounded-xl border border-white/5">
          <div className="relative group/weather">
            <Button
              size="sm"
              variant={weather !== 'none' ? 'primary' : 'ghost'}
              className="rounded-lg"
              icon={<CloudRain className="w-4 h-4" />}
              title={`Weather: ${weather}`}
            />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-32 bg-stone-900/90 backdrop-blur-2xl border border-stone-800 rounded-xl shadow-2xl opacity-0 invisible group-hover/weather:opacity-100 group-hover/weather:visible transition-all duration-300 translate-y-2 group-hover/weather:translate-y-0 p-1.5 z-50">
              {(['none', 'rain', 'storm', 'snow', 'mist', 'ash'] as WeatherType[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWeather(w)}
                  className={`flex items-center w-full text-left px-3 py-2 text-[10px] rounded-lg mt-0.5 first:mt-0 uppercase tracking-widest transition-colors ${weather === w
                    ? 'bg-emerald-900/40 text-emerald-400 font-bold border border-emerald-500/20'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                    }`}
                >
                  {w === 'none' ? 'Clear' : w}
                </button>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            variant={isErasingFoW ? 'primary' : 'ghost'}
            onClick={() => {
              setShowFogPanel(false);
              setIsTorchEditMode(false);
              setIsErasingFoW((prev) => !prev);
            }}
            icon={<Eraser className="w-4 h-4" />}
            className="rounded-lg"
            title="Toggle Eraser (E)"
          />
          <Button
            size="sm"
            variant={showFogPanel ? 'primary' : 'ghost'}
            onClick={() => {
              setShowFogPanel((prev) => !prev);
              setIsTorchEditMode(false);
            }}
            className="rounded-lg px-2"
            title="Open Fog Controls"
          >
            Fog
          </Button>
          <Button
            size="sm"
            variant={showTorches ? 'primary' : 'ghost'}
            onClick={() => {
              setShowTorches((prev) => {
                const next = !prev;
                if (!next) {
                  setIsTorchEditMode(false);
                  setShowFogPanel(false);
                  setSelectedTorchId(null);
                  setDraggingTorchId(null);
                } else if (torches.length === 0) {
                  setIsTorchEditMode(true);
                  setShowFogPanel(false);
                }
                return next;
              });
            }}
            icon={<Flame className="w-4 h-4" />}
            className="rounded-lg"
            title="Toggle Torch Lighting (T)"
          />
          {showTorches && (
            <Button
              size="sm"
              variant={showTorches && isTorchEditMode ? 'primary' : 'ghost'}
              onClick={() => {
                setShowTorches(true);
                setShowFogPanel(false);
                setIsErasingFoW(false);
                setIsTorchEditMode((prev) => !prev);
              }}
              className="rounded-lg px-2"
              title="Edit Torch Positions (L)"
            >
              L
            </Button>
          )}
        </div>

        {(isErasingFoW || showFogPanel || historyCounts.undo > 0 || historyCounts.redo > 0) && (
          <div className="flex items-center gap-1 bg-stone-950/40 p-1 rounded-xl border border-white/5">
            <Button
              size="sm"
              variant="ghost"
              onClick={undoFog}
              icon={<Undo2 className="w-4 h-4 text-stone-500" />}
              className="rounded-lg"
              title="Undo Fog Change (Ctrl/Cmd+Z)"
              disabled={historyCounts.undo === 0}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={redoFog}
              icon={<Redo2 className="w-4 h-4 text-stone-500" />}
              className="rounded-lg"
              title="Redo Fog Change (Ctrl/Cmd+Shift+Z)"
              disabled={historyCounts.redo === 0}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={restoreFoW}
              icon={<RefreshCw className="w-4 h-4 text-stone-500 hover:text-red-500" />}
              className="rounded-lg"
              title="Restore Fog (R)"
            />
            <Button
              size="sm"
              variant={showFoW ? 'primary' : 'ghost'}
              onClick={() => setShowFoW((prev) => !prev)}
              icon={showFoW ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-stone-500" />}
              className="rounded-lg"
              title={showFoW ? 'Hide Fog' : 'Show Fog'}
            />
          </div>
        )}

        {(showTorches || selectedTorchId) && (
          <div className="flex items-center gap-1 bg-stone-950/40 p-1 rounded-xl border border-white/5">
            <Button
              size="sm"
              variant="ghost"
              onClick={removeSelectedTorch}
              icon={<Trash2 className="w-4 h-4 text-stone-500" />}
              className="rounded-lg"
              title="Delete Selected Torch (Delete)"
              disabled={!selectedTorchId}
            />
            <span className="hidden md:inline text-[10px] font-mono text-stone-500 px-1">
              {torches.length} torches
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 bg-stone-950/40 p-1 rounded-xl border border-white/5">
          <Button
            onClick={toggleProjectionMode}
            variant={isProjectionMode ? 'primary' : 'ghost'}
            size="sm"
            className="rounded-lg px-2 text-stone-300"
            title="Projection Mode (P)"
          >
            Proj
          </Button>
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="sm"
            icon={isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            className="rounded-lg text-stone-500"
            title="Fullscreen (F)"
          />
          <Button
            onClick={() => setIsToolbarVisible(false)}
            variant="ghost"
            size="sm"
            icon={<ChevronUp className="w-4 h-4" />}
            className="rounded-lg text-stone-500"
            title="Dismiss Toolbar (H)"
          />
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-[#080706] flex">
        <div
          ref={containerRef}
          className={`flex-1 relative overflow-hidden touch-none ${showTorches && isTorchEditMode ? 'cursor-cell' : isErasingFoW ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        >
          {!isProjectionMode && (
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
          )}

          <div
            className="absolute origin-center transition-transform duration-75 will-change-transform"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              left: '50%',
              top: '50%',
              marginLeft: '-50%',
              marginTop: '-50%',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              className="relative inline-block touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.8)] ring-1 ring-stone-800 animate-in fade-in zoom-in duration-1000">
                <img
                  ref={imageRef}
                  src={map.url}
                  alt="Map"
                  draggable={false}
                  onLoad={() => {
                    initFoW();
                    fitMapToView();
                  }}
                  className="max-w-none"
                  style={{
                    imageRendering: scale > 1 ? 'pixelated' : 'auto',
                  }}
                />
                <canvas
                  ref={fowCanvasRef}
                  className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700 ${showFoW ? 'opacity-100' : 'opacity-0'}`}
                  style={{ opacity: showFoW ? 0.98 : 0 }}
                />
                {selectionPreviewStyle && (
                  <div
                    className="absolute pointer-events-none border-2 border-emerald-300/90 bg-emerald-400/20 z-30"
                    style={selectionPreviewStyle}
                  />
                )}
                <WeatherOverlay type={weather} />
                <canvas
                  ref={torchCanvasRef}
                  className={`absolute inset-0 w-full h-full pointer-events-none z-[60] transition-opacity duration-300 ${showTorches ? 'opacity-100' : 'opacity-0'}`}
                />
                {torchOverlayData.map((torch) => (
                  <React.Fragment key={torch.id}>
                    {selectedTorchId === torch.id && (
                      <div
                        className="absolute pointer-events-none border border-amber-300/70 rounded-full z-50"
                        style={{
                          left: `${torch.leftPercent}%`,
                          top: `${torch.topPercent}%`,
                          width: `${torch.radiusPercentX * 2}%`,
                          height: `${torch.radiusPercentY * 2}%`,
                          transform: 'translate(-50%, -50%)',
                          boxShadow: '0 0 24px rgba(251, 191, 36, 0.35)',
                        }}
                      />
                    )}
                    <div
                      className={`absolute pointer-events-none rounded-full border z-50 ${selectedTorchId === torch.id ? 'w-4 h-4 border-amber-300 bg-amber-200/70' : 'w-3 h-3 border-amber-500/70 bg-amber-500/50'}`}
                      style={{
                        left: `${torch.leftPercent}%`,
                        top: `${torch.topPercent}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {!isProjectionMode && (
          <div className="absolute bottom-8 right-8 z-30 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity duration-1000 hidden md:block">
            <div className="relative w-24 h-24 border border-stone-800 rounded-full flex items-center justify-center">
              <div className="absolute inset-0 border border-stone-800 rounded-full scale-110 border-dashed"></div>
              <Compass className="w-12 h-12 text-stone-600" />
            </div>
          </div>
        )}

        {!isProjectionMode && isToolbarVisible && showFogPanel && (
          <div className="absolute bottom-20 right-5 z-20 rounded-lg border border-stone-800/60 bg-stone-950/75 px-3 py-3 text-[10px] font-mono uppercase tracking-wide text-stone-400 backdrop-blur-sm w-[220px]">
            <div className="mb-2 text-stone-300">Fog Controls</div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={revealMode === 'brush' ? 'primary' : 'ghost'}
                  onClick={() => setRevealMode('brush')}
                  className="rounded-lg px-2 flex-1"
                  title="Brush Reveal Mode"
                >
                  Brush
                </Button>
                <Button
                  size="sm"
                  variant={revealMode === 'box' ? 'primary' : 'ghost'}
                  onClick={() => setRevealMode('box')}
                  className="rounded-lg px-2 flex-1"
                  title="Box Reveal Mode (B)"
                >
                  Box
                </Button>
              </div>
              {revealMode === 'brush' ? (
                <label className="flex items-center justify-between gap-2">
                  <span>Size</span>
                  <input
                    type="range"
                    min={MIN_BRUSH_SIZE}
                    max={MAX_BRUSH_SIZE}
                    step={5}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-28 accent-emerald-500"
                    title="Brush Size ([ and ])"
                  />
                  <span className="w-8 text-right">{brushSize}</span>
                </label>
              ) : (
                <label className="flex items-center justify-between gap-2">
                  <span>Soft</span>
                  <input
                    type="range"
                    min={MIN_BOX_SOFTNESS}
                    max={MAX_BOX_SOFTNESS}
                    step={2}
                    value={boxSoftness}
                    onChange={(e) => setBoxSoftness(Number(e.target.value))}
                    className="w-28 accent-emerald-500"
                    title="Box Edge Softness"
                  />
                  <span className="w-8 text-right">{boxSoftness}</span>
                </label>
              )}
            </div>
          </div>
        )}

        {!isProjectionMode && isToolbarVisible && showTorches && !showFogPanel && (
          <div className="absolute bottom-20 right-5 z-20 rounded-lg border border-stone-800/60 bg-stone-950/75 px-3 py-3 text-[10px] font-mono uppercase tracking-wide text-stone-400 backdrop-blur-sm w-[220px]">
            <div className="mb-2 text-stone-300">Torch Controls</div>
            {torches.length === 0 && (
              <div className="mb-2 text-stone-500 normal-case tracking-normal">
                Enable `Edit` and click the map to place a torch.
              </div>
            )}
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2">
                <span>Dark</span>
                <input
                  type="range"
                  min={MIN_DARKNESS_LEVEL}
                  max={MAX_DARKNESS_LEVEL}
                  step={0.01}
                  value={torchDarkness}
                  onChange={(e) => setTorchDarkness(Number(e.target.value))}
                  className="w-28 accent-amber-500"
                  title="Darkness Level"
                />
                <span className="w-8 text-right">{Math.round(torchDarkness * 100)}%</span>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Radius</span>
                <input
                  type="range"
                  min={MIN_TORCH_RADIUS}
                  max={MAX_TORCH_RADIUS}
                  step={5}
                  value={torchRadiusControl}
                  onChange={(e) => {
                    const value = clamp(Number(e.target.value), MIN_TORCH_RADIUS, MAX_TORCH_RADIUS);
                    setTorchRadiusControl(value);
                    if (selectedTorchId) {
                      setTorches((prev) => prev.map((torch) => (torch.id === selectedTorchId ? { ...torch, radius: value } : torch)));
                    }
                  }}
                  className="w-28 accent-amber-500"
                  title="Torch Radius"
                />
                <span className="w-8 text-right">{Math.round(torchRadiusControl)}</span>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Power</span>
                <input
                  type="range"
                  min={MIN_TORCH_INTENSITY}
                  max={MAX_TORCH_INTENSITY}
                  step={0.01}
                  value={torchIntensityControl}
                  onChange={(e) => {
                    const value = clamp(Number(e.target.value), MIN_TORCH_INTENSITY, MAX_TORCH_INTENSITY);
                    setTorchIntensityControl(value);
                    if (selectedTorchId) {
                      setTorches((prev) => prev.map((torch) => (torch.id === selectedTorchId ? { ...torch, intensity: value } : torch)));
                    }
                  }}
                  className="w-28 accent-amber-500"
                  title="Torch Intensity"
                />
                <span className="w-8 text-right">{Math.round(torchIntensityControl * 100)}%</span>
              </label>
            </div>
          </div>
        )}

        {!isProjectionMode && isToolbarVisible && (
          <div className="absolute bottom-5 left-5 z-20 rounded-lg border border-stone-800/60 bg-stone-950/70 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-stone-500 backdrop-blur-sm">
            H UI | F Full | P Project | E Fog | B Brush/Box | T Torches | L Torch Edit | Del Remove | Cmd/Ctrl+Z Undo
          </div>
        )}
      </div>
    </div>
  );
};
