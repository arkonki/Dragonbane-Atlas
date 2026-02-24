import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapData } from '../types';
import { X, ZoomIn, ZoomOut, Move, Maximize, Minimize } from 'lucide-react';
import { Button } from './Button';

interface MapViewerProps {
  map: MapData;
  onClose: () => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({ map, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Zoom handling
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.1, scale + delta), 5);
    setScale(newScale);
  }, [scale]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div ref={viewerRef} className="fixed inset-0 z-50 bg-black flex flex-col h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="h-16 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-6 shrink-0 z-10 shadow-xl">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-display text-stone-200 font-bold tracking-wide">{map.name}</h2>
          <div className="h-6 w-px bg-stone-700 mx-2" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setScale(s => Math.min(s + 0.1, 5))} icon={<ZoomIn className="w-4 h-4"/>} />
            <span className="text-xs font-mono text-stone-500 w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button size="sm" variant="secondary" onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} icon={<ZoomOut className="w-4 h-4"/>} />
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPosition({x:0, y:0})} title="Reset View" icon={<Move className="w-4 h-4" />} />
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={toggleFullscreen} 
            variant="ghost" 
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            icon={isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />} 
          />

          <Button onClick={onClose} variant="ghost" icon={<X className="w-5 h-5" />} />
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden bg-stone-950 flex">
        
        {/* Map Canvas */}
        <div 
          ref={containerRef}
          className={`flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ 
                 backgroundImage: 'radial-gradient(#444 1px, transparent 1px)',
                 backgroundSize: '20px 20px'
               }} 
          />
          
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
              justifyContent: 'center'
            }}
          >
            <img 
              src={map.url} 
              alt="Map" 
              draggable={false}
              className="max-w-none shadow-2xl shadow-black ring-1 ring-stone-800"
              style={{
                imageRendering: scale > 1 ? 'pixelated' : 'auto' 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};