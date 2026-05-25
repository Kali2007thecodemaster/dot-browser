interface TopBarProps {
  isDarkMode: boolean;
  onToggleDark: () => void;
  isAgentActive?: boolean;
  /** Called when the dot brand mark is clicked — starts a new chat. */
  onLogoClick?: () => void;
}

/** Sun + moon stacked in one button; cross-fade and rotate on toggle. */
const ThemeToggle = ({ isDarkMode, onToggle }: { isDarkMode: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    className="theme-toggle"
    style={{ color: 'var(--muted)' }}>
    {/* Sun — visible in dark mode (so users see what mode they'd switch TO is light) */}
    <svg
      className={`theme-toggle-icon ${isDarkMode ? 'is-active' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
    {/* Moon — visible in light mode */}
    <svg
      className={`theme-toggle-icon ${!isDarkMode ? 'is-active' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
);

const TopBar = ({ isDarkMode, onToggleDark, isAgentActive = false, onLogoClick }: TopBarProps) => {
  return (
    <div
      className="glass flex h-10 shrink-0 items-center justify-between px-4"
      style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
      <button
        type="button"
        onClick={onLogoClick}
        disabled={!onLogoClick}
        aria-label="New chat"
        title="New chat"
        className="flex items-center gap-2.5"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: onLogoClick ? 'pointer' : 'default',
        }}>
        <div style={{ width: 8, height: 8, background: 'var(--accent)', flexShrink: 0, borderRadius: 2 }} />
        <span className="label-mono" style={{ color: 'var(--text)', fontSize: 10 }}>
          DOT / v0.1
        </span>
      </button>

      <div className="flex items-center gap-3">
        <div
          className={isAgentActive ? 'animate-pulse' : ''}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isAgentActive ? 'var(--accent)' : 'var(--muted)',
          }}
        />
        <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleDark} />
      </div>
    </div>
  );
};

export default TopBar;
