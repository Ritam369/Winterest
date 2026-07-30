import { useMemo, useEffect, useState } from 'react';
import WallpaperCard from './WallpaperCard.jsx';

// ─── Column count based on container width ────────────────────────────────────
const getColumnCount = (width) => {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  return 2;
};

const useColumnCount = () => {
  const [cols, setCols] = useState(() => getColumnCount(window.innerWidth));

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setCols(getColumnCount(entry.contentRect.width));
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return cols;
};

// ─── Assign wallpapers to columns using aspect ratios ─────────────────────────
// Each wallpaper has width+height from the DB, so we can compute column heights
// without waiting for images to load. New items always go to the shortest column,
// meaning previously placed items never move when a new batch arrives.
const assignColumns = (wallpapers, colCount, colWidth) => {
  const columns = Array.from({ length: colCount }, () => []);
  const heights = new Array(colCount).fill(0);
  const GAP = 12; // px — matches the gap-3 (12px) in the grid

  for (const wallpaper of wallpapers) {
    // Find the shortest column
    const shortestCol = heights.indexOf(Math.min(...heights));

    // Compute rendered height from aspect ratio + column width
    const aspectRatio  = wallpaper.height / wallpaper.width;
    const renderedHeight = colWidth * aspectRatio;

    columns[shortestCol].push(wallpaper);
    heights[shortestCol] += renderedHeight + GAP;
  }

  return columns;
};

// ─── Component ────────────────────────────────────────────────────────────────
const MasonryGrid = ({
  wallpapers = [],
  onCardClick,
  onDownload,
  loadingMore = false,
  hasMore = false,
  sentinelRef,
}) => {
  const colCount = useColumnCount();

  // Compute column width: full viewport minus horizontal padding (px-4 md:px-8 = 32px/64px)
  // We use a rough estimate here; the actual column width is (containerWidth - gaps) / colCount
  const colWidth = useMemo(() => {
    const padding = window.innerWidth >= 768 ? 64 : 32; // px-4 = 16px each side, px-8 = 32px
    const totalGap = (colCount - 1) * 12;
    return (window.innerWidth - padding - totalGap) / colCount;
  }, [colCount]);

  const columns = useMemo(
    () => assignColumns(wallpapers, colCount, colWidth),
    [wallpapers, colCount, colWidth]
  );

  if (wallpapers.length === 0 && !loadingMore) {
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
    <div className="flex flex-col">
      {/* Grid: independent columns as flex containers */}
      <div className="flex gap-3 px-1 py-4 items-start">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-3 flex-1 min-w-0">
            {col.map((wallpaper) => (
              <WallpaperCard
                key={wallpaper._id}
                wallpaper={wallpaper}
                onClick={() => onCardClick(wallpaper)}
                onDownload={() => onDownload(wallpaper)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Sentinel for IntersectionObserver scroll detection */}
      <div ref={sentinelRef} className="h-1" />

      {/* Spinner while fetching next batch */}
      {loadingMore && (
        <div className="flex justify-center items-center py-8 gap-2 text-[var(--color-ash)]">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm font-medium">Loading more…</span>
        </div>
      )}

      {/* End-of-feed indicator */}
      {!hasMore && !loadingMore && wallpapers.length > 0 && (
        <p className="text-center text-xs text-[var(--color-ash)] py-8 font-medium">
          You've seen all {wallpapers.length} wallpapers ✦
        </p>
      )}
    </div>
  );
};

export default MasonryGrid;
