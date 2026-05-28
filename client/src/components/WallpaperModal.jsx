import { useEffect } from 'react';

const WallpaperModal = ({ wallpaper, onClose, onDownload }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleDownload = async () => {
    onDownload();
    try {
      const res = await fetch(wallpaper.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `winterest-${wallpaper._id}.${wallpaper.format}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(wallpaper.url, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Modal card */}
      <div
        className="relative z-10 max-w-5xl w-full max-h-[90svh] bg-[var(--color-canvas)] rounded-[var(--radius-lg)] overflow-hidden shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="flex-1 bg-[var(--color-charcoal)] flex items-center justify-center overflow-hidden">
          <img
            src={wallpaper.url}
            alt={wallpaper.tags.join(', ') || 'wallpaper'}
            className="max-w-full max-h-[90svh] md:max-h-[85svh] object-contain"
          />
        </div>

        {/* Sidebar */}
        <div className="md:w-64 shrink-0 p-6 flex flex-col gap-5 border-t md:border-t-0 md:border-l border-[var(--color-hairline-soft)]">
          {/* Close */}
          <button
            onClick={onClose}
            className="self-end w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-surface-card)] hover:bg-[var(--color-secondary-pressed)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-[var(--color-mute)]">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {wallpaper.clicks} views
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {wallpaper.downloads} downloads
            </span>
          </div>

          {/* Tags */}
          {wallpaper.tags.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[var(--color-ash)] uppercase tracking-wide">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {wallpaper.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[var(--color-surface-card)] text-[var(--color-body)] text-xs font-semibold px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dimensions */}
          <div className="flex flex-col gap-1 text-sm text-[var(--color-mute)]">
            <p className="text-xs font-semibold text-[var(--color-ash)] uppercase tracking-wide">Info</p>
            <p>{wallpaper.width} × {wallpaper.height}px</p>
            <p className="capitalize">{wallpaper.orientation} · {wallpaper.format.toUpperCase()}</p>
          </div>

          {/* Download CTA */}
          <button
            onClick={handleDownload}
            className="mt-auto flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white font-bold text-sm h-10 rounded-[var(--radius-md)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default WallpaperModal;
