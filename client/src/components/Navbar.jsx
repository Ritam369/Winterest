import logo from '../assets/winterest.png';

const Navbar = ({ query, onSearch }) => {
  return (
    <header className="sticky top-0 z-40 bg-[var(--color-canvas)] border-b border-[var(--color-hairline-soft)]">
      <div className="max-w-screen-xl mx-auto h-16 px-4 flex items-center gap-4">
        <a href="/" className="shrink-0">
          <img src={logo} alt="Winterest" className="h-8 w-auto" />
        </a>

        <div className="flex-1 max-w-xl">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ash)] pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by tag…"
              className="w-full h-12 pl-11 pr-4 rounded-full bg-[var(--color-surface-card)] text-[var(--color-ink)] placeholder-[var(--color-ash)] text-sm font-medium outline-none focus:bg-[var(--color-canvas)] focus:ring-2 focus:ring-[var(--color-hairline)] transition-colors"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
