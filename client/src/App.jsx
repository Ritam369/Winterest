import { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import MasonryGrid from './components/MasonryGrid.jsx';
import WallpaperModal from './components/WallpaperModal.jsx';
import useWallpapers from './hooks/useWallpapers.js';
import SkeletonGrid from './components/SkeletonGrid.jsx';
import useTheme from './hooks/useTheme.js';

const App = () => {
  const { wallpapers, allWallpapers, query, setQuery, loading, error, trackClick, trackDownload } = useWallpapers();
  const [selected, setSelected] = useState(null);
  const { dark, toggle } = useTheme();

  const handleCardClick = (wallpaper) => {
    setSelected(wallpaper);
    trackClick(wallpaper._id);
  };

  const handleDownload = (wallpaper) => {
    trackDownload(wallpaper._id);
  };

  return (
    <div className="min-h-svh bg-[var(--color-canvas)]">
      <Navbar query={query} onSearch={setQuery} dark={dark} onToggleTheme={toggle} wallpapers={allWallpapers} />

      {/* <main className="max-w-screen-2xl mx-auto"> */}
      <main className="w-full px-4 md:px-8">
        {loading && <SkeletonGrid />}

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
