const HEIGHTS = [220, 300, 180, 260, 340, 200, 280, 240, 190, 320, 210, 270];

const SkeletonGrid = () => (
  <div className="flex flex-col items-center gap-6 px-2 py-4">
    <div className="flex items-start gap-2 bg-[var(--color-surface-card)] border border-[var(--color-hairline)] rounded-[var(--radius-md)] px-4 py-3 max-w-md w-full">
      <svg className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-ash)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
      </svg>
      <p className="text-xs text-[var(--color-mute)] leading-relaxed">
        Fetching wallpapers from Render's free tier — this can take <span className="font-semibold text-[var(--color-body)]">20–25 seconds</span> on a cold start. Hang tight!
      </p>
    </div>

    <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2 w-full">
      {HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="break-inside-avoid mb-2 rounded-[var(--radius-md)] bg-[var(--color-surface-card)] animate-pulse"
          style={{ height: h }}
        />
      ))}
    </div>
  </div>
);

export default SkeletonGrid;
