import { memo } from 'react';
import type { Message } from '@extension/storage';
import { formatTimestamp } from '../utils';

interface UserMessageProps {
  message: Message;
}

const UserMessage = memo(({ message }: UserMessageProps) => {
  return (
    <div className="flex justify-end">
      <div style={{ maxWidth: '80%' }}>
        <div
          className="px-3 py-2"
          style={{
            background: 'var(--text)',
            color: 'var(--bg)',
            borderRadius: '4px 4px 2px 4px',
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
          {message.content}
        </div>
        <div className="label-mono mt-0.5 text-right" style={{ color: 'var(--muted)' }}>
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
});

UserMessage.displayName = 'UserMessage';
export default UserMessage;
