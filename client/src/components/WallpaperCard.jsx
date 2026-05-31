import downloadWallpaper from '../hooks/downloadWallpaper.js';

const WallpaperCard = ({ wallpaper, onClick, onDownload }) => {
  const { url, tags = [], clicks, downloads } = wallpaper;

  const handleDownload = async (e) => {
    e.stopPropagation();
    onDownload();
    await downloadWallpaper(wallpaper);
  };

  return (
    <div
      onClick={onClick}
      className="group relative cursor-zoom-in rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-surface-card)] break-inside-avoid mb-3"
    >
      <img
        src={url}
        alt={tags.join(', ') || 'wallpaper'}
        loading="lazy"
        className="w-full h-auto block"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
        {/* Download button */}
        <div className="flex justify-end">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-xs font-bold px-3 py-2 rounded-full transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        </div>

        {/* Bottom: tags + stats */}
        <div className="flex flex-col gap-1.5">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 text-white/80 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {clicks}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloads}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WallpaperCard;
