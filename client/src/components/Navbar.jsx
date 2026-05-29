import logo from '../assets/winterest.png';

const Navbar = ({ query, onSearch, dark, onToggleTheme }) => {
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

        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="ml-auto shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface-card)] hover:bg-[var(--color-secondary-pressed)] text-[var(--color-ink)] transition-colors"
        >
          {dark ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};

export default Navbar;
