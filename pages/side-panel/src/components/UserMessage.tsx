import { memo } from 'react';
import type { Message } from '@extension/storage';
import { formatTimestamp } from '../utils';
import MessageActions from './MessageActions';

interface UserMessageProps {
  message: Message;
  /** Pre-fills the chat input with this message's content for the user to edit. */
  onEdit?: () => void;
  /** Disable edit while the agent is running. */
  actionsDisabled?: boolean;
}

const UserMessage = memo(({ message, onEdit, actionsDisabled = false }: UserMessageProps) => {
  return (
    <div className="flex flex-col items-end">
      <div style={{ maxWidth: '82%' }}>
        <div
          className="chat-bubble-user"
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 15,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
          {message.content}
        </div>
        <div className="label-mono mt-1 text-right" style={{ color: 'var(--muted)', fontSize: 10 }}>
          {formatTimestamp(message.timestamp)}
        </div>
        <MessageActions content={message.content} onEdit={onEdit} disabled={actionsDisabled} alignRight />
      </div>
    </div>
  );
});

UserMessage.displayName = 'UserMessage';
export default UserMessage;
