import { useState, useEffect, useMemo } from 'react';
import api from '../services/api.js';

const useWallpapers = () => {
  const [wallpapers, setWallpapers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/wallpapers')
      .then((res) => setWallpapers(res.data.data ?? []))
      .catch(() => setError('Failed to load wallpapers'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return wallpapers;
    const q = query.trim().toLowerCase();
    return wallpapers.filter((w) =>
      (w.tags ?? []).some((tag) => tag.includes(q))
    );
  }, [wallpapers, query]);

  const trackClick = (id) => {
    api.patch(`/wallpapers/${id}/click`).catch(() => {});
    setWallpapers((prev) =>
      prev.map((w) => (w._id === id ? { ...w, clicks: w.clicks + 1 } : w))
    );
  };

  const trackDownload = (id) => {
    api.patch(`/wallpapers/${id}/download`).catch(() => {});
    setWallpapers((prev) =>
      prev.map((w) => (w._id === id ? { ...w, downloads: w.downloads + 1 } : w))
    );
  };

  return { wallpapers: filtered ?? [], allWallpapers: wallpapers, query, setQuery, loading, error, trackClick, trackDownload };
};

export default useWallpapers;
