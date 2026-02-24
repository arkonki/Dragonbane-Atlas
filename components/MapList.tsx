import React from 'react';
import { MapData } from '../types';
import { Trash2, Eye, Map as MapIcon } from 'lucide-react';
import { Button } from './Button';

interface MapListProps {
  maps: MapData[];
  onSelect: (map: MapData) => void;
  onDelete: (id: string) => void;
}

export const MapList: React.FC<MapListProps> = ({ maps, onSelect, onDelete }) => {
  if (maps.length === 0) {
    return (
      <div className="text-center py-20 border border-stone-800 rounded-lg bg-stone-900/50">
        <MapIcon className="w-16 h-16 text-stone-700 mx-auto mb-4" />
        <h3 className="text-xl font-display text-stone-400 mb-2">No Maps in the Archives</h3>
        <p className="text-stone-600">Upload a map to begin your adventure.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {maps.map((map) => (
        <div 
          key={map.id} 
          className="group relative bg-stone-900 border border-stone-800 rounded-lg overflow-hidden hover:border-emerald-600/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        >
          {/* Thumbnail Aspect Ratio Container */}
          <div className="aspect-[4/3] bg-stone-950 relative overflow-hidden">
            <img 
              src={map.url} 
              alt={map.name}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent opacity-80" />
            
            {/* Actions overlay on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-sm">
              <Button 
                size="sm" 
                onClick={() => onSelect(map)}
                icon={<Eye className="w-4 h-4" />}
              >
                View
              </Button>
              <Button 
                variant="danger" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(map.id);
                }}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Discard
              </Button>
            </div>
          </div>

          <div className="p-4 relative">
            <h4 className="font-display font-bold text-stone-200 truncate pr-2" title={map.name}>
              {map.name}
            </h4>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-stone-500 font-mono">
                {(map.file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <span className="text-xs text-stone-500 font-mono">
                {new Date(map.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
             <svg viewBox="0 0 100 100" className="w-full h-full fill-stone-800 group-hover:fill-emerald-800 transition-colors">
                <path d="M0 0 L100 0 L100 100 Z" />
             </svg>
          </div>
        </div>
      ))}
    </div>
  );
};