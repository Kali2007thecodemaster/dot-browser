import { memo } from 'react';
import type { Message } from '@extension/storage';
import { ACTOR_PROFILES } from '../types/message';
import { formatTimestamp } from '../utils';

interface AgentMessageProps {
  message: Message;
  isActive?: boolean;
  showHeader?: boolean;
}

const ACTOR_INITIALS: Record<string, string> = {
  user: 'U',
  system: 'S',
  planner: 'P',
  navigator: 'N',
  validator: 'V',
  manager: 'M',
  evaluator: 'E',
};

const AgentMessage = memo(({ message, isActive = false, showHeader = true }: AgentMessageProps) => {
  const actor = ACTOR_PROFILES[message.actor as keyof typeof ACTOR_PROFILES];
  const initial = ACTOR_INITIALS[message.actor] ?? message.actor[0]?.toUpperCase() ?? '?';
  const isProgress = message.content === 'Showing progress...';

  return (
    <div className="flex items-start gap-2">
      {showHeader ? (
        <div
          className="glass label-mono shrink-0 flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            borderColor: isActive ? 'var(--accent)' : undefined,
            color: isActive ? 'var(--accent)' : 'var(--muted)',
            fontWeight: 700,
          }}>
          {initial}
        </div>
      ) : (
        <div style={{ width: 28, flexShrink: 0 }} />
      )}

      <div style={{ minWidth: 0, flex: 1, maxWidth: 'calc(100% - 36px)' }}>
        {showHeader && (
          <div className="label-mono mb-1" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            {actor?.name ?? message.actor}
          </div>
        )}
        <div
          className="glass px-3 py-2"
          style={{
            borderRadius: '2px 4px 4px 4px',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text)',
          }}>
          {isProgress ? (
            <div style={{ height: 2, overflow: 'hidden', background: 'var(--line)', borderRadius: 1 }}>
              <div className="animate-progress" style={{ height: '100%', background: 'var(--accent)', width: '40%' }} />
            </div>
          ) : (
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</span>
          )}
        </div>
        {!isProgress && (
          <div className="label-mono mt-0.5 text-right" style={{ color: 'var(--muted)' }}>
            {formatTimestamp(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
});

AgentMessage.displayName = 'AgentMessage';
export default AgentMessage;
