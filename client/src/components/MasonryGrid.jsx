import WallpaperCard from './WallpaperCard.jsx';

const MasonryGrid = ({ wallpapers, onCardClick, onDownload }) => {
  if (wallpapers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-[var(--color-ash)]">
        <svg className="w-12 h-12 mb-4 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="text-sm font-medium">No wallpapers found</p>
      </div>
    );
  }

  return (
    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2 px-2 py-4">
      {wallpapers.map((wallpaper) => (
        <WallpaperCard
          key={wallpaper._id}
          wallpaper={wallpaper}
          onClick={() => onCardClick(wallpaper)}
          onDownload={() => onDownload(wallpaper)}
        />
      ))}
    </div>
  );
};

export default MasonryGrid;
