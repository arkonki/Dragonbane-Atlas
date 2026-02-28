import React from 'react';
import { MapData } from '../types';
import { Trash2, Eye, Map as MapIcon, Star, Clock, Globe } from 'lucide-react';
import { Button } from './Button';

interface MapListProps {
  maps: MapData[];
  onSelect: (map: MapData) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const MapList: React.FC<MapListProps> = ({ maps, onSelect, onDelete, onToggleFavorite }) => {
  if (maps.length === 0) {
    return (
      <div className="text-center py-14 sm:py-24 border-2 border-dashed border-stone-800 rounded-xl bg-stone-900/30 backdrop-blur-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"></div>
        <MapIcon className="w-14 h-14 sm:w-20 sm:h-20 text-stone-800 mx-auto mb-4 sm:mb-6 group-hover:text-emerald-900/50 transition-colors duration-500" />
        <h3 className="text-xl sm:text-2xl font-display text-stone-500 mb-2">The Archives are Empty</h3>
        <p className="text-stone-600 font-serif italic text-base sm:text-lg">"No explorer has yet returned with news of the world."</p>
      </div>
    );
  }

  // Sort favorites to the top
  const sortedMaps = [...maps].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {sortedMaps.map((map) => (
        <div
          key={map.id}
          className="group relative bg-stone-900/40 backdrop-blur-md border border-stone-800/50 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-500 shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col"
        >
          {/* Thumbnail Aspect Ratio Container */}
          <div className="aspect-[16/10] bg-stone-950 relative overflow-hidden">
            <img
              src={map.url}
              alt={map.name}
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
            />

            {/* Favorite Indicator / Button */}
            <button
              onClick={() => onToggleFavorite(map.id)}
              className={`absolute top-3 left-3 z-20 p-2 rounded-full backdrop-blur-md border transition-all duration-300 ${map.isFavorite
                  ? 'bg-amber-900/40 border-amber-600/50 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-black/40 border-white/5 text-white/30 hover:text-white/80 hover:border-white/20'
                }`}
            >
              <Star className={`w-4 h-4 ${map.isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Metadata Badges */}
            <div className="absolute top-3 right-3 z-20 hidden sm:flex gap-2">
              <div className="px-2 py-1 rounded bg-black/50 backdrop-blur-md border border-white/5 text-[10px] font-mono text-stone-400 opacity-0 sm:group-hover:opacity-100 transition-opacity translate-y-2 sm:group-hover:translate-y-0 duration-300">
                ID: {map.id.substring(0, 5)}
              </div>
            </div>

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent opacity-90 group-hover:opacity-40 transition-opacity duration-500" />

            {/* Actions overlay on hover */}
            <div className="absolute inset-0 bg-stone-950/60 opacity-0 sm:group-hover:opacity-100 transition-all duration-300 hidden sm:flex items-center justify-center gap-4 backdrop-blur-[2px]">
              <Button
                size="md"
                variant="primary"
                onClick={() => onSelect(map)}
                icon={<Eye className="w-4 h-4" />}
              >
                Journey
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(map.id);
                }}
                icon={<Trash2 className="w-4 h-4 text-red-800" />}
                className="hover:!bg-red-950/20"
              />
            </div>
          </div>

          <div className="sm:hidden px-3 py-3 flex items-center gap-2 border-b border-stone-800/50 bg-stone-950/50">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onSelect(map)}
              icon={<Eye className="w-4 h-4" />}
              className="flex-1"
            >
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(map.id);
              }}
              icon={<Trash2 className="w-4 h-4 text-red-800" />}
              className="hover:!bg-red-950/20"
            />
          </div>

          <div className="p-4 sm:p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-3 gap-3">
              <h4 className="font-display font-black text-stone-100 text-base sm:text-lg uppercase tracking-wide leading-tight group-hover:text-emerald-400 transition-colors" title={map.name}>
                {map.name}
              </h4>
              {map.isFavorite && (
                <span className="flex-shrink-0 animate-pulse">
                  <Star className="w-3 h-3 text-amber-500 fill-current" />
                </span>
              )}
            </div>

            <div className="mt-auto space-y-2 pt-4 border-t border-stone-800/50">
              <div className="flex items-center gap-2 text-stone-500 text-xs font-serif italic">
                <Globe className="w-3 h-3" />
                <span>Dragonbane Territory</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] text-stone-600 font-mono uppercase tracking-tighter">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(map.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-stone-800 group-hover:bg-emerald-600 transition-colors shadow-[0_0_5px_rgba(0,0,0,0.5)]"></div>
              </div>
            </div>
          </div>

          {/* Decorative Corner Glow */}
          <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-emerald-500/5 blur-[30px] group-hover:bg-emerald-500/20 transition-all duration-700 rounded-full"></div>
        </div>
      ))}
    </div>
  );
};
