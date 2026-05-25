import { memo, useEffect } from 'react';
import { FiSettings, FiDatabase, FiFileText, FiBell, FiClock, FiX } from 'react-icons/fi';
import { PiPlusBold } from 'react-icons/pi';
import { GrHistory } from 'react-icons/gr';

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onLoadHistory: () => void;
  onOpenResults: () => void;
  onOpenWatches: () => void;
  onOpenSchedules: () => void;
  onMarkdownSnapshot: () => void;
  onOpenSettings: () => void;
  snapshotEnabled: boolean;
}

interface NavItem {
  icon: JSX.Element;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const SideNav = memo(
  ({
    isOpen,
    onClose,
    onNewChat,
    onLoadHistory,
    onOpenResults,
    onOpenWatches,
    onOpenSchedules,
    onMarkdownSnapshot,
    onOpenSettings,
    snapshotEnabled,
  }: SideNavProps) => {
    // Close on Escape for keyboard users.
    useEffect(() => {
      if (!isOpen) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const fire = (fn: () => void) => () => {
      fn();
      onClose();
    };

    const primary: NavItem[] = [
      { icon: <PiPlusBold size={17} />, label: 'New chat', onClick: fire(onNewChat) },
      { icon: <GrHistory size={17} />, label: 'History', onClick: fire(onLoadHistory) },
      { icon: <FiDatabase size={16} />, label: 'Saved results', onClick: fire(onOpenResults) },
      { icon: <FiBell size={16} />, label: 'Web watches', onClick: fire(onOpenWatches) },
      { icon: <FiClock size={16} />, label: 'Scheduled tasks', onClick: fire(onOpenSchedules) },
      {
        icon: <FiFileText size={16} />,
        label: 'Snapshot page',
        onClick: fire(onMarkdownSnapshot),
        disabled: !snapshotEnabled,
      },
    ];

    return (
      <>
        <div
          className={`sidenav-backdrop ${isOpen ? 'open' : ''}`}
          onClick={onClose}
          aria-hidden={!isOpen}
          role="presentation"
        />
        {/* `inert` replaces `aria-hidden` here: `aria-hidden` on an ancestor of a focused
            element trips a Chrome a11y warning. `inert` blocks focus + a11y in one go
            and is the spec-recommended replacement. The `as any` cast is because the
            React 18 types don't expose `inert` yet; it's a standard HTML attribute. */}
        <aside
          className={`sidenav ${isOpen ? 'open' : ''}`}
          aria-label="Side navigation"
          {...(!isOpen ? ({ inert: '' } as { inert: string }) : {})}>
          <div className="sidenav-header">
            <span className="label-mono" style={{ color: 'var(--muted)' }}>
              MENU
            </span>
            <button type="button" onClick={onClose} className="sidenav-close" aria-label="Close menu">
              <FiX size={18} />
            </button>
          </div>
          <div className="sidenav-items">
            {primary.map(it => (
              <button key={it.label} type="button" className="sidenav-item" onClick={it.onClick} disabled={it.disabled}>
                <span className="sidenav-icon">{it.icon}</span>
                <span>{it.label}</span>
              </button>
            ))}
          </div>
          <div className="sidenav-footer">
            <button type="button" className="sidenav-item" onClick={fire(onOpenSettings)}>
              <span className="sidenav-icon">
                <FiSettings size={16} />
              </span>
              <span>Settings</span>
            </button>
          </div>
        </aside>
      </>
    );
  },
);

SideNav.displayName = 'SideNav';
export default SideNav;
