import { useEffect, useRef, useState, useMemo } from 'react';
import WallpaperCard from './WallpaperCard.jsx';

// ─── Column count based on viewport width ─────────────────────────────────────
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

const getColWidth = (colCount) => {
  const padding  = window.innerWidth >= 768 ? 64 : 32;
  const totalGap = (colCount - 1) * 12;
  return (window.innerWidth - padding - totalGap) / colCount;
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

  // Columns store only _ids — never stale wallpaper objects.
  // Live wallpaper data is always looked up from the wallpapers prop at render time.
  const columnIdsRef    = useRef([]);   // array of arrays of _id strings
  const colHeightsRef   = useRef([]);
  const assignedIdsRef  = useRef(new Set());
  const prevColCountRef = useRef(colCount);

  const [columnIds, setColumnIds] = useState([]); // triggers re-render

  // Build a fast id→wallpaper lookup map from the live prop
  const wallpaperMap = useMemo(() => {
    const map = new Map();
    for (const w of wallpapers) map.set(w._id, w);
    return map;
  }, [wallpapers]);

  // Incremental column assignment — only processes new items.
  // Resets fully when the wallpapers list changes non-incrementally
  // (e.g. switching to search results or clearing search).
  useEffect(() => {
    const colWidth   = getColWidth(colCount);
    const GAP        = 12;
    const colChanged = prevColCountRef.current !== colCount;
    prevColCountRef.current = colCount;

    // Detect a non-incremental change: any currently assigned id is no longer
    // in the incoming wallpapers list (feed→search, search→feed, search→new search)
    const incomingIds   = new Set(wallpapers.map((w) => w._id));
    const isNonIncremental = colChanged ||
      [...assignedIdsRef.current].some((id) => !incomingIds.has(id));

    if (isNonIncremental) {
      // Full rebuild from scratch
      const newCols    = Array.from({ length: colCount }, () => []);
      const newHeights = new Array(colCount).fill(0);
      const newIds     = new Set();

      for (const w of wallpapers) {
        const shortest       = newHeights.indexOf(Math.min(...newHeights));
        const renderedHeight = colWidth * (w.height / w.width);
        newCols[shortest].push(w._id);
        newHeights[shortest] += renderedHeight + GAP;
        newIds.add(w._id);
      }

      columnIdsRef.current   = newCols;
      colHeightsRef.current  = newHeights;
      assignedIdsRef.current = newIds;
      setColumnIds(newCols.map((c) => [...c]));
      return;
    }

    // Normal case: only assign items not yet placed (new batch arrivals)
    const unassigned = wallpapers.filter((w) => !assignedIdsRef.current.has(w._id));
    if (unassigned.length === 0) return;

    if (columnIdsRef.current.length !== colCount) {
      columnIdsRef.current  = Array.from({ length: colCount }, () => []);
      colHeightsRef.current = new Array(colCount).fill(0);
    }

    for (const w of unassigned) {
      const heights        = colHeightsRef.current;
      const shortest       = heights.indexOf(Math.min(...heights));
      const renderedHeight = colWidth * (w.height / w.width);
      columnIdsRef.current[shortest].push(w._id);
      colHeightsRef.current[shortest] += renderedHeight + GAP;
      assignedIdsRef.current.add(w._id);
    }

    setColumnIds(columnIdsRef.current.map((c) => [...c]));
  }, [wallpapers, colCount]);

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
      <div className="flex gap-3 px-1 py-4 items-start">
        {columnIds.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-3 flex-1 min-w-0">
            {col.map((id) => {
              const wallpaper = wallpaperMap.get(id);
              if (!wallpaper) return null;
              return (
                <WallpaperCard
                  key={id}
                  wallpaper={wallpaper}
                  onClick={() => onCardClick(wallpaper)}
                  onDownload={() => onDownload(wallpaper)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="flex justify-center items-center py-8 gap-2 text-[var(--color-ash)]">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm font-medium">Loading more…</span>
        </div>
      )}

      {!hasMore && !loadingMore && wallpapers.length > 0 && (
        <p className="text-center text-xs text-[var(--color-ash)] py-8 font-medium">
          You've seen all {wallpapers.length} wallpapers ✦
        </p>
      )}
    </div>
  );
};

export default MasonryGrid;
