interface TopBarProps {
  isDarkMode: boolean;
  onToggleDark: () => void;
  isAgentActive?: boolean;
}

const TopBar = ({ isDarkMode, onToggleDark, isAgentActive = false }: TopBarProps) => {
  return (
    <div
      className="glass flex h-9 shrink-0 items-center justify-between px-3"
      style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
      <div className="flex items-center gap-2">
        <div style={{ width: 8, height: 8, background: 'var(--accent)', flexShrink: 0 }} />
        <span className="label-mono" style={{ color: 'var(--text)' }}>
          DOT / v0.1
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={isAgentActive ? 'animate-pulse' : ''}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: isAgentActive ? 'var(--accent)' : 'var(--muted)',
          }}
        />
        <button
          type="button"
          onClick={onToggleDark}
          className="label-mono"
          style={{
            color: 'var(--muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.2s linear',
          }}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDarkMode ? 'LT' : 'DK'}
        </button>
      </div>
    </div>
  );
};

export default TopBar;
