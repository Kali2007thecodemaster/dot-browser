import { useState } from 'react';

interface BootScreenProps {
  onBoot: () => void;
}

const BootScreen = ({ onBoot }: BootScreenProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6" style={{ background: 'var(--bg)' }}>
      <span
        className="label-mono"
        style={{
          border: '1px solid var(--line)',
          borderRadius: 999,
          padding: '4px 12px',
          color: 'var(--muted)',
        }}>
        PERSONAL WEB AGENT
      </span>

      <h1
        style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 28,
          fontWeight: 400,
          color: 'var(--text)',
          lineHeight: 1.2,
          textAlign: 'center',
          margin: 0,
        }}>
        Ready when you <em>are.</em>
      </h1>

      <p className="label-mono" style={{ color: 'var(--muted)', textAlign: 'center', maxWidth: 200, margin: 0 }}>
        AI-POWERED WEB AUTOMATION
      </p>

      <button
        type="button"
        onClick={onBoot}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `1px solid ${hovered ? 'var(--accent)' : 'var(--line)'}`,
          background: 'var(--glass)',
          backdropFilter: 'blur(16px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: hovered ? 'var(--accent)' : 'var(--muted)',
          transition: 'border-color 0.2s linear, color 0.2s linear',
          outline: 'none',
        }}
        aria-label="Initialize agent">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
      </button>

      <span className="label-mono" style={{ color: 'var(--muted)' }}>
        INITIALIZE
      </span>
    </div>
  );
};

export default BootScreen;
