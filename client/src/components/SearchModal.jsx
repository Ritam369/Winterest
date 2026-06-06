import { useState, useEffect, useRef, useMemo } from 'react';

const RECENT_KEY = 'winterest_recent_searches';
const MAX_RECENT = 8;

const SearchIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);

const getRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) ?? []; }
  catch { return []; }
};

const saveRecent = (term) => {
  if (!term.trim()) return;
  const prev = getRecent().filter((t) => t !== term);
  localStorage.setItem(RECENT_KEY, JSON.stringify([term, ...prev].slice(0, MAX_RECENT)));
};

const SearchModal = ({ onClose, onSearch, wallpapers = [] }) => {
  const [input, setInput] = useState('');
  const [recent, setRecent] = useState(getRecent);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);

  const allTags = useMemo(() => {
    const set = new Set();
    wallpapers.forEach((w) => (w.tags ?? []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [wallpapers]);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.trim().toLowerCase();
    return allTags.filter((t) => t.includes(q)).slice(0, 8);
  }, [input, allTags]);

  // Live wallpaper preview filtered by current input
  const previewWallpapers = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.trim().toLowerCase();
    return wallpapers.filter((w) => (w.tags ?? []).some((t) => t.includes(q))).slice(0, 6);
  }, [input, wallpapers]);

  const listItems = input.trim() ? suggestions : recent;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const selectItem = (term) => {
    saveRecent(term);
    setRecent(getRecent());
    onSearch(term);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, listItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && listItems[activeIdx]) {
        selectItem(listItems[activeIdx]);
      } else if (input.trim()) {
        selectItem(input.trim());
      }
    }
  };

  const clearRecent = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Wrapper: positions close button relative to modal card */}
      <div className="relative w-full max-w-lg" onMouseDown={(e) => e.stopPropagation()}>
        {/* Close button — floated above the modal, top-right corner */}
        <button
          onClick={onClose}
          aria-label="Close search"
          className="absolute -top-10 right-0 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-surface-card)] border border-[var(--color-hairline)] text-[var(--color-ash)] hover:text-[var(--color-ink)] hover:bg-[var(--color-secondary-pressed)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="w-full rounded-2xl shadow-2xl overflow-hidden bg-[var(--color-surface-card)] border border-[var(--color-hairline)]">
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-hairline)]">
          <span className="text-[var(--color-ash)]"><SearchIcon /></span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setActiveIdx(-1); }}
            onKeyDown={handleKeyDown}
            placeholder="Search by tag…"
            className="flex-1 bg-transparent text-[var(--color-ink)] placeholder-[var(--color-ash)] text-sm outline-none"
          />
          {input && (
            <button
              onClick={() => { setInput(''); setActiveIdx(-1); inputRef.current?.focus(); }}
              aria-label="Clear input"
              className="text-[var(--color-ash)] hover:text-[var(--color-ink)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Live wallpaper preview */}
        {previewWallpapers.length > 0 && (
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-semibold text-[var(--color-ash)] uppercase tracking-wide mb-2">Preview</p>
            <div className="grid grid-cols-3 gap-2">
              {previewWallpapers.map((w) => (
                <div key={w._id} className="rounded-lg overflow-hidden aspect-video bg-[var(--color-surface-soft)]">
                  <img src={w.url} alt={w.tags?.[0] ?? ''} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent searches / suggestions list */}
        {listItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-xs font-semibold text-[var(--color-ash)] uppercase tracking-wide">
                {input.trim() ? 'Suggestions' : 'Recent searches'}
              </span>
              {!input.trim() && recent.length > 0 && (
                <button
                  onClick={clearRecent}
                  className="text-xs text-[var(--color-ash)] hover:text-[var(--color-ink)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <ul className="py-1">
              {listItems.map((item, idx) => (
                <li key={item}>
                  <button
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => selectItem(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      activeIdx === idx
                        ? 'bg-[var(--color-secondary-pressed)] text-[var(--color-ink)]'
                        : 'text-[var(--color-body)] hover:bg-[var(--color-secondary-bg)]'
                    }`}
                  >
                    <span className="text-[var(--color-ash)]">
                      {input.trim() ? <SearchIcon /> : <ClockIcon />}
                    </span>
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer keyboard hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--color-hairline)] text-[var(--color-ash)] text-xs">
          {[['↑↓', 'Navigate'], ['↵', 'Select'], ['Esc', 'Close']].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[var(--color-secondary-bg)] font-mono text-[11px]">{key}</kbd>
              {label}
            </span>
          ))}
        </div>
        </div>{/* end modal card */}
      </div>{/* end relative wrapper */}
    </div>
  );
};

export default SearchModal;
