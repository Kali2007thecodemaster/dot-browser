import { memo } from 'react';

interface LiveStatusBarProps {
  actor: string;
  text: string;
}

const LiveStatusBar = memo(({ actor, text }: LiveStatusBarProps) => (
  <div className="flex items-center gap-2.5 px-2 py-2" style={{ minWidth: 0 }}>
    <div className="flex shrink-0 items-center gap-[3px]">
      <span className="status-dot" />
      <span className="status-dot" />
      <span className="status-dot" />
    </div>
    <span className="label-mono shrink-0" style={{ color: 'var(--accent)', fontSize: 10 }}>
      {actor}
    </span>
    <span
      style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 13,
        lineHeight: 1.4,
        color: 'var(--muted)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        minWidth: 0,
      }}>
      {text}
    </span>
  </div>
));

LiveStatusBar.displayName = 'LiveStatusBar';
export default LiveStatusBar;
