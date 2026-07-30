import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api.js';

const BATCH_SIZE    = 20;
const AUTO_INTERVAL = 5000; // ms between auto-fetches when user doesn't scroll

// ─── sessionStorage helpers ───────────────────────────────────────────────────
const SS_KEY = 'winterest_feed';

const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveSession = (wallpapers, page, total) => {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify({ wallpapers, page, total }));
  } catch {
    // storage quota exceeded — silently skip
  }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
const useWallpapers = () => {
  const session = loadSession();

  const [wallpapers, setWallpapers]       = useState(session?.wallpapers ?? []);
  const [page, setPage]                   = useState(session?.page       ?? 0);
  const [total, setTotal]                 = useState(session?.total      ?? null);
  const [loading, setLoading]             = useState(!session);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [error, setError]                 = useState(null);

  const [query, setQuery]                 = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Refs so event handlers always see current values without stale closures
  const pageRef        = useRef(page);
  const totalRef       = useRef(total);
  const loadingMoreRef = useRef(false);
  const wallpapersRef  = useRef(wallpapers);
  const hasScrolledRef = useRef(false); // tracks whether a scroll happened since last fetch

  pageRef.current       = page;
  totalRef.current      = total;
  wallpapersRef.current = wallpapers;

  const hasMore = total === null || wallpapers.length < total;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  // ── Core fetch ───────────────────────────────────────────────────────────────
  const fetchNextBatch = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (totalRef.current !== null && wallpapersRef.current.length >= totalRef.current) return;

    loadingMoreRef.current = true;
    hasScrolledRef.current = false; // reset scroll flag after each fetch
    setLoadingMore(true);

    const nextPage = pageRef.current + 1;

    try {
      const res = await api.get('/wallpapers', {
        params: { page: nextPage, limit: BATCH_SIZE },
      });

      const { wallpapers: batch, total: newTotal } = res.data.data;

      setWallpapers((prev) => {
        const existingIds = new Set(prev.map((w) => w._id));
        const fresh  = batch.filter((w) => !existingIds.has(w._id));
        const merged = [...prev, ...fresh];
        saveSession(merged, nextPage, newTotal);
        return merged;
      });

      setPage(nextPage);
      setTotal(newTotal);
    } catch {
      setError('Failed to load wallpapers');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
      setLoading(false);
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (session) return; // restored from sessionStorage — skip
    fetchNextBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scroll detection ─────────────────────────────────────────────────────────
  // Any scroll event triggers the next batch immediately (if not already loading
  // and there's more to fetch). After fetching, the flag resets so the next
  // scroll can trigger again.
  useEffect(() => {
    if (!hasMore) return; // nothing left to fetch — don't attach listener

    const onScroll = () => {
      if (!hasScrolledRef.current && !loadingMoreRef.current && hasMoreRef.current) {
        hasScrolledRef.current = true;
        fetchNextBatch();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasMore, fetchNextBatch]);

  // ── 5-second auto-fetch timer ────────────────────────────────────────────────
  // Fires every 5s as long as: not in search mode, not loading, and more to fetch.
  useEffect(() => {
    if (query.trim()) return;
    if (!hasMore) return;

    const id = setInterval(() => {
      if (!loadingMoreRef.current) {
        fetchNextBatch();
      }
    }, AUTO_INTERVAL);

    return () => clearInterval(id);
  }, [query, hasMore, fetchNextBatch]);

  // ── Server-side search ───────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    setSearchResults(null);

    const controller = new AbortController();

    api
      .get('/wallpapers/search', {
        params: { q },
        signal: controller.signal,
      })
      .then((res) => setSearchResults(res.data.data ?? []))
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setSearchResults([]);
        }
      })
      .finally(() => setSearchLoading(false));

    return () => controller.abort();
  }, [query]);

  // ── Track interactions ───────────────────────────────────────────────────────
  const trackClick = useCallback((id) => {
    api.patch(`/wallpapers/${id}/click`).catch(() => {});
    setWallpapers((prev) =>
      prev.map((w) => (w._id === id ? { ...w, clicks: w.clicks + 1 } : w))
    );
  }, []);

  const trackDownload = useCallback((id) => {
    api.patch(`/wallpapers/${id}/download`).catch(() => {});
    setWallpapers((prev) =>
      prev.map((w) => (w._id === id ? { ...w, downloads: w.downloads + 1 } : w))
    );
  }, []);

  const isSearchMode   = query.trim().length > 0;
  const displayList    = isSearchMode ? (searchResults ?? []) : wallpapers;
  const isLoadingFirst = loading && wallpapers.length === 0;

  return {
    wallpapers:    displayList,
    allWallpapers: wallpapers,
    query,
    setQuery,
    loading:      isLoadingFirst,
    loadingMore:  isSearchMode ? searchLoading : loadingMore,
    hasMore:      isSearchMode ? false : hasMore,
    error,
    trackClick,
    trackDownload,
    sentinelRef:  useRef(null), // kept for MasonryGrid DOM structure, no longer observed
  };
};

export default useWallpapers;
