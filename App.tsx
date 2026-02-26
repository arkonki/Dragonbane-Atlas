import React, { useState, useEffect } from 'react';
import { MapData, AppView } from './types';
import { MapList } from './components/MapList';
import { MapViewer } from './components/MapViewer';
import { Scroll, Skull, Sword, Search, Star } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LIBRARY);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Load maps from server and sync with favorites in local storage
  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const response = await fetch('/api/maps');

        if (!response.ok) {
          throw new Error(`The Archives returned an error: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("The Archives returned non-JSON data. The Nexus link may be corrupted.");
        }

        const serverMaps: MapData[] = await response.json();

        // Get saved favorites from local storage
        const saved = localStorage.getItem('dragonbane-maps');
        const localMaps: MapData[] = saved ? JSON.parse(saved) : [];
        const favorites = new Set(localMaps.filter((m: MapData) => m.isFavorite).map((m: MapData) => m.id));

        // Merge server data with favorite status
        const syncedMaps = serverMaps.map(m => ({
          ...m,
          isFavorite: favorites.has(m.id)
        }));

        setMaps(syncedMaps);
        setIsInitialLoadComplete(true);
      } catch (err) {
        console.error("Failed to fetch maps from the archives:", err);
      }
    };

    fetchMaps();
  }, []);

  // Persist favorites to local storage whenever maps change
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const favoritesOnly = maps.filter((m: MapData) => m.isFavorite);
    localStorage.setItem('dragonbane-maps', JSON.stringify(favoritesOnly));
  }, [maps, isInitialLoadComplete]);

  // Handle map deletion (now purges favorites since files are managed manually)
  const handleDelete = (id: string) => {
    if (confirm("Are you certain you wish to purge this territory's records? The local image file will remain, but favorites will be lost.")) {
      setMaps((prev: MapData[]) => prev.filter((m: MapData) => m.id !== id));
      if (selectedMap?.id === id) {
        setSelectedMap(null);
        setView(AppView.LIBRARY);
      }
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = (id: string) => {
    setMaps((prev: MapData[]) => prev.map((m: MapData) =>
      m.id === id ? { ...m, isFavorite: !m.isFavorite } : m
    ));
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
  const filteredMaps = maps.filter((m: MapData) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteCount = maps.filter((m: MapData) => m.isFavorite).length;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans selection:bg-emerald-900 selection:text-emerald-100 relative overflow-x-hidden">
      {/* Dynamic Background Decoration */}
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none"></div>
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-amber-900/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Viewer Overlay */}
      {view === AppView.VIEWER && selectedMap && (
        <MapViewer map={selectedMap} onClose={handleCloseViewer} />
      )}

      {/* Main Library Layout */}
      <div className={`transition-all duration-700 relative z-10 ${view === AppView.VIEWER ? 'opacity-0 scale-95 pointer-events-none fixed' : 'opacity-100 scale-100'}`}>

        {/* Header */}
        <header className="border-b border-stone-800/50 bg-stone-900/40 backdrop-blur-xl sticky top-0 z-30 shadow-2xl">
          <div className="container mx-auto px-6 py-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">

              {/* Logo / Title */}
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl group-hover:bg-emerald-500/40 transition-all duration-500 rounded-full"></div>
                  <div className="relative w-14 h-14 bg-stone-900 border-2 border-emerald-800/50 rounded-xl flex items-center justify-center transform rotate-3 group-hover:rotate-0 transition-all duration-500 shadow-inner">
                    <Skull className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-display font-black tracking-[0.2em] text-white uppercase drop-shadow-md">
                    Dragonbane <span className="text-emerald-500">Atlas</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-px w-4 bg-emerald-800"></div>
                    <p className="text-[10px] text-stone-500 font-mono tracking-[0.3em] uppercase">Tactical Cartography Suite</p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-[450px] group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-stone-600 group-focus-within:text-emerald-400 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Scry the archives for a specific scroll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-stone-800/50 rounded-full leading-5 bg-stone-950/50 text-stone-200 placeholder-stone-600 focus:outline-none focus:bg-stone-900 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 sm:text-sm transition-all shadow-inner"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-6 py-10 max-w-7xl">

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { label: 'Archived Scrolls', value: maps.length, icon: Scroll, color: 'text-stone-400' },
              { label: 'Pinned Territories', value: favoriteCount, icon: Star, color: 'text-amber-500' },
              { label: 'Recently Explored', value: maps.slice(0, 1).length > 0 ? maps[0].name : 'None', icon: Sword, color: 'text-emerald-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-stone-900/40 border border-stone-800/50 rounded-lg p-5 backdrop-blur-sm flex flex-col gap-2 items-center md:items-start group hover:bg-stone-800/60 transition-all duration-300">
                <div className="flex items-center gap-3 text-stone-500 mb-1">
                  <stat.icon className={`w-4 h-4 ${stat.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[11px] uppercase tracking-[0.2em] font-mono font-bold">{stat.label}</span>
                </div>
                <div className="text-xl font-display font-bold text-white tracking-wide truncate w-full">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Library Section */}
          <section className="pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center">
                  <Scroll className="w-4 h-4 text-stone-400" />
                </div>
                <h2 className="text-xl font-display font-bold text-stone-100 uppercase tracking-widest">Historical Archives {maps.length > 0 && `(${maps.length})`}</h2>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-stone-500 uppercase">
                <span className="opacity-50 italic">Files managed manually in /public/uploads/</span>
                <div className="h-4 w-px bg-stone-800 mx-2"></div>
                <span>Sorted by:</span>
                <span className="text-emerald-600 font-bold px-2 py-1 bg-emerald-900/10 rounded">Importance / Date</span>
              </div>
            </div>

            <MapList
              maps={filteredMaps}
              onSelect={handleSelectMap}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
            />
          </section>

        </main>

        {/* Footer */}
        <footer className="border-t border-stone-900/40 pt-12 pb-10 text-center relative opacity-50 hover:opacity-100 transition-opacity">
          <div className="container mx-auto px-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-px bg-stone-800"></div>
              <p className="text-[10px] text-stone-600 font-mono tracking-[0.4em] uppercase">
                Dragonbane Atlas &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;