import { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import MasonryGrid from './components/MasonryGrid.jsx';
import WallpaperModal from './components/WallpaperModal.jsx';
import useWallpapers from './hooks/useWallpapers.js';

const App = () => {
  const { wallpapers, query, setQuery, loading, error, trackClick, trackDownload } = useWallpapers();
  const [selected, setSelected] = useState(null);

  const handleCardClick = (wallpaper) => {
    setSelected(wallpaper);
    trackClick(wallpaper._id);
  };

  const handleDownload = (wallpaper) => {
    trackDownload(wallpaper._id);
  };

  return (
    <div className="min-h-svh bg-[var(--color-canvas)]">
      <Navbar query={query} onSearch={setQuery} />

      <main className="max-w-screen-2xl mx-auto">
        {loading && (
          <div className="flex justify-center items-center py-32">
            <div className="w-8 h-8 border-2 border-[var(--color-hairline)] border-t-[var(--color-primary)] rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex justify-center py-32">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <MasonryGrid
            wallpapers={wallpapers}
            onCardClick={handleCardClick}
            onDownload={handleDownload}
          />
        )}
      </main>

      {selected && (
        <WallpaperModal
          wallpaper={selected}
          onClose={() => setSelected(null)}
          onDownload={() => handleDownload(selected)}
        />
      )}
    </div>
  );
};

export default App;
