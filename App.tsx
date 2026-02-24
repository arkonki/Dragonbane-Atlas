import React, { useState } from 'react';
import { MapData, AppView } from './types';
import { MapUploader } from './components/MapUploader';
import { MapList } from './components/MapList';
import { MapViewer } from './components/MapViewer';
import { Scroll, Skull, Sword, Search } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LIBRARY);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle file upload
  const handleUpload = (file: File) => {
    const newMap: MapData = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      file: file,
      url: URL.createObjectURL(file),
      createdAt: Date.now()
    };

    setMaps(prev => [newMap, ...prev]);
  };

  // Handle map deletion
  const handleDelete = (id: string) => {
    setMaps(prev => {
      const target = prev.find(m => m.id === id);
      if (target) {
        URL.revokeObjectURL(target.url); // Cleanup memory
      }
      return prev.filter(m => m.id !== id);
    });
    if (selectedMap?.id === id) {
      setSelectedMap(null);
      setView(AppView.LIBRARY);
    }
  };

  // Select a map to view
  const handleSelectMap = (map: MapData) => {
    setSelectedMap(map);
    setView(AppView.VIEWER);
  };

  // Close viewer
  const handleCloseViewer = () => {
    setView(AppView.LIBRARY);
    setSelectedMap(null);
  };

  // Filter maps
  const filteredMaps = maps.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-emerald-900 selection:text-emerald-100">
      
      {/* Viewer Overlay */}
      {view === AppView.VIEWER && selectedMap && (
        <MapViewer map={selectedMap} onClose={handleCloseViewer} />
      )}

      {/* Main Library Layout */}
      <div className={`transition-opacity duration-500 ${view === AppView.VIEWER ? 'opacity-0 pointer-events-none fixed' : 'opacity-100'}`}>
        
        {/* Header */}
        <header className="border-b border-stone-800 bg-stone-900/80 backdrop-blur-md sticky top-0 z-30">
          <div className="container mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Logo / Title */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-900/30 border border-emerald-800 rounded-lg flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300">
                   <Skull className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-black tracking-wider text-emerald-100 uppercase">
                    Dragonbane <span className="text-emerald-600">Atlas</span>
                  </h1>
                  <p className="text-xs text-stone-500 font-mono tracking-widest uppercase">Battle Map Manager</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-96 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-stone-600 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search archives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-stone-800 rounded-md leading-5 bg-stone-950 text-stone-300 placeholder-stone-600 focus:outline-none focus:bg-stone-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 sm:text-sm transition-all"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-6 py-8">
          
          {/* Uploader Section */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Sword className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-display font-bold text-stone-300">Add New Territory</h2>
            </div>
            <MapUploader onUpload={handleUpload} />
          </section>

          {/* Library Section */}
          <section>
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Scroll className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-display font-bold text-stone-300">Map Archives ({maps.length})</h2>
                </div>
                {/* Stats or simple sort actions could go here */}
             </div>
             
             <MapList 
                maps={filteredMaps} 
                onSelect={handleSelectMap} 
                onDelete={handleDelete}
             />
          </section>

        </main>
        
        {/* Footer */}
        <footer className="border-t border-stone-800 bg-stone-950 mt-12 py-8 text-center">
          <p className="text-stone-600 text-sm font-serif">
            "Keep your blade sharp and your maps dry."
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;