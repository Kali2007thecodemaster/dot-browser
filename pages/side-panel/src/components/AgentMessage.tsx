import { memo } from 'react';
import type { Message } from '@extension/storage';
import { ACTOR_PROFILES } from '../types/message';
import { formatTimestamp } from '../utils';
import MarkdownText from './MarkdownText';
import MessageActions from './MessageActions';

interface AgentMessageProps {
  message: Message;
  isActive?: boolean;
  showHeader?: boolean;
  /** Re-runs the user task that produced this response. Hidden when not provided. */
  onRetry?: () => void;
  /** Disable retry while the agent is running. */
  actionsDisabled?: boolean;
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

const AgentMessage = memo(
  ({ message, isActive = false, showHeader = true, onRetry, actionsDisabled = false }: AgentMessageProps) => {
    const actor = ACTOR_PROFILES[message.actor as keyof typeof ACTOR_PROFILES];
    const initial = ACTOR_INITIALS[message.actor] ?? message.actor[0]?.toUpperCase() ?? '?';
    const isProgress = message.content === 'Showing progress...';

    return (
      <div className="flex items-start gap-3">
        {showHeader ? (
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 12,
              fontWeight: 600,
            }}>
            {initial}
          </div>
        ) : (
          <div style={{ width: 24, flexShrink: 0 }} />
        )}

        <div style={{ minWidth: 0, flex: 1, maxWidth: 'calc(100% - 36px)' }}>
          {showHeader && <div className="actor-label mb-1.5">{actor?.name ?? message.actor}</div>}
          {isProgress ? (
            <div className="chat-bubble body-md">
              <div style={{ height: 2, overflow: 'hidden', background: 'var(--line)', borderRadius: 1 }}>
                <div
                  className="animate-progress"
                  style={{ height: '100%', background: 'var(--accent)', width: '40%' }}
                />
              </div>
            </div>
          ) : (
            // Bare text on the page background — ChatGPT/Claude style.
            // No bubble; markdown handles paragraphs, lists, etc.
            <div className="body-md" style={{ wordBreak: 'break-word' }}>
              <MarkdownText text={message.content} />
            </div>
          )}
          {!isProgress && (
            <>
              <div className="label-mono mt-1" style={{ color: 'var(--muted)', fontSize: 10 }}>
                {formatTimestamp(message.timestamp)}
              </div>
              <MessageActions content={message.content} onRetry={onRetry} disabled={actionsDisabled} />
            </>
          )}
        </div>
      </div>
    );
  },
);

AgentMessage.displayName = 'AgentMessage';
export default AgentMessage;
