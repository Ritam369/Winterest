import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api.js';

const BATCH_SIZE    = 20;
const AUTO_INTERVAL = 5000;

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
  } catch {}
};

const clearSession = () => {
  try { sessionStorage.removeItem(SS_KEY); } catch {}
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
const useWallpapers = () => {
  const [wallpapers, setWallpapers]       = useState([]);
  const [page, setPage]                   = useState(0);
  const [total, setTotal]                 = useState(null);
  const [loading, setLoading]             = useState(true);  // true until first batch is shown
  const [loadingMore, setLoadingMore]     = useState(false);
  const [error, setError]                 = useState(null);

  const [query, setQuery]                 = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const pageRef        = useRef(0);
  const totalRef       = useRef(null);
  const loadingMoreRef = useRef(false);
  const wallpapersRef  = useRef([]);
  const hasScrolledRef = useRef(false);

  const hasMore = totalRef.current === null || wallpapersRef.current.length < totalRef.current;
  const hasMoreRef = useRef(true);

  // Keep refs in sync
  const syncRefs = (w, p, t) => {
    wallpapersRef.current = w;
    pageRef.current       = p;
    totalRef.current      = t;
    hasMoreRef.current    = t === null || w.length < t;
  };

  // ── Core fetch ───────────────────────────────────────────────────────────────
  const fetchNextBatch = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (totalRef.current !== null && wallpapersRef.current.length >= totalRef.current) return;

    loadingMoreRef.current = true;
    hasScrolledRef.current = false;
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
        syncRefs(merged, nextPage, newTotal);
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

  // ── Initial load — always validate session against server ────────────────────
  // Fetch page 1 from server every time the page loads.
  // If the newest item matches what's in sessionStorage, restore the full session
  // (so the user doesn't re-fetch pages they already saw).
  // If it doesn't match (new images added), discard the session and start fresh.
  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get('/wallpapers', {
          params: { page: 1, limit: BATCH_SIZE },
        });

        const { wallpapers: firstBatch, total: newTotal } = res.data.data;

        const session        = loadSession();
        const serverNewestId = firstBatch[0]?._id;
        const sessionNewestId = session?.wallpapers?.[0]?._id;

        if (session && serverNewestId === sessionNewestId && session.wallpapers.length >= BATCH_SIZE) {
          // Session is still valid — restore it
          setWallpapers(session.wallpapers);
          setPage(session.page);
          setTotal(newTotal); // always use fresh total in case more were added
          syncRefs(session.wallpapers, session.page, newTotal);
        } else {
          // New images exist or no valid session — start fresh from page 1
          clearSession();
          setWallpapers(firstBatch);
          setPage(1);
          setTotal(newTotal);
          syncRefs(firstBatch, 1, newTotal);
          saveSession(firstBatch, 1, newTotal);
        }
      } catch {
        setError('Failed to load wallpapers');
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scroll detection ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (!hasScrolledRef.current && !loadingMoreRef.current && hasMoreRef.current) {
        hasScrolledRef.current = true;
        fetchNextBatch();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fetchNextBatch]);

  // ── 5-second auto-fetch timer ────────────────────────────────────────────────
  useEffect(() => {
    if (query.trim()) return;

    const id = setInterval(() => {
      if (!loadingMoreRef.current && hasMoreRef.current) {
        fetchNextBatch();
      }
    }, AUTO_INTERVAL);

    return () => clearInterval(id);
  }, [query, fetchNextBatch]);

  // ── Server-side search ───────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (!q) { setSearchResults(null); return; }

    setSearchLoading(true);
    setSearchResults(null);

    const controller = new AbortController();
    api
      .get('/wallpapers/search', { params: { q }, signal: controller.signal })
      .then((res) => setSearchResults(res.data.data ?? []))
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') setSearchResults([]);
      })
      .finally(() => setSearchLoading(false));

    return () => controller.abort();
  }, [query]);

  // ── Track interactions ───────────────────────────────────────────────────────
  const trackClick = useCallback((id) => {
    api.patch(`/wallpapers/${id}/click`).catch(() => {});
    setWallpapers((prev) => prev.map((w) => (w._id === id ? { ...w, clicks: w.clicks + 1 } : w)));
  }, []);

  const trackDownload = useCallback((id) => {
    api.patch(`/wallpapers/${id}/download`).catch(() => {});
    setWallpapers((prev) => prev.map((w) => (w._id === id ? { ...w, downloads: w.downloads + 1 } : w)));
  }, []);

  const isSearchMode   = query.trim().length > 0;
  const displayList    = isSearchMode ? (searchResults ?? []) : wallpapers;

  return {
    wallpapers:   displayList,
    allWallpapers: wallpapers,
    query,
    setQuery,
    loading,
    loadingMore:  isSearchMode ? searchLoading : loadingMore,
    hasMore:      isSearchMode ? false : hasMoreRef.current,
    error,
    trackClick,
    trackDownload,
    sentinelRef:  useRef(null),
  };
};

export default useWallpapers;
