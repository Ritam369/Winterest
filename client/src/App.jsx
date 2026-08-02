import { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import MasonryGrid from './components/MasonryGrid.jsx';
import WallpaperModal from './components/WallpaperModal.jsx';
import useWallpapers from './hooks/useWallpapers.js';
import SkeletonGrid from './components/SkeletonGrid.jsx';
import useTheme from './hooks/useTheme.js';

const App = () => {
  const {
    wallpapers,
    allWallpapers,
    query,
    setQuery,
    loading,
    loadingMore,
    hasMore,
    error,
    trackClick,
    trackDownload,
    sentinelRef,
  } = useWallpapers();

  // Store only the _id, then derive the full object from the live wallpapers array.
  // This ensures the modal always reflects the latest clicks/downloads count
  // after an optimistic update instead of showing the frozen snapshot.
  const [selectedId, setSelectedId] = useState(null);
  const selected = allWallpapers.find((w) => w._id === selectedId) ?? null;

  const { dark, toggle } = useTheme();

  const handleCardClick = (wallpaper) => {
    setSelectedId(wallpaper._id);
    trackClick(wallpaper._id);
  };

  const handleDownload = (wallpaper) => {
    trackDownload(wallpaper._id);
  };

  return (
    <div className="min-h-svh bg-[var(--color-canvas)]">
      <Navbar query={query} onSearch={setQuery} dark={dark} onToggleTheme={toggle} wallpapers={allWallpapers} />

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
            loadingMore={loadingMore}
            hasMore={hasMore}
            sentinelRef={sentinelRef}
          />
        )}
      </main>

      {selected && (
        <WallpaperModal
          wallpaper={selected}
          onClose={() => setSelectedId(null)}
          onDownload={() => handleDownload(selected)}
        />
      )}
    </div>
  );
};

export default App;
