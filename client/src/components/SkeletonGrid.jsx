const HEIGHTS = [220, 300, 180, 260, 340, 200, 280, 240, 190, 320, 210, 270, 230, 290, 170, 310, 250, 185, 265, 305];

const SkeletonGrid = () => (
  <div className="columns-2 sm:columns-2 md:columns-2 lg:columns-3 xl:columns-4 gap-3 px-1 py-4">
    {HEIGHTS.map((h, i) => (
      <div
        key={i}
        className="break-inside-avoid mb-3 rounded-[var(--radius-md)] bg-[var(--color-surface-card)] animate-pulse"
        style={{ height: h }}
      />
    ))}
  </div>
);

export default SkeletonGrid;
