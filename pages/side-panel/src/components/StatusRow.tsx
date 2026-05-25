import { memo } from 'react';
import type { Message } from '@extension/storage';

interface StatusRowProps {
  message: Message;
}

const StatusRow = memo(({ message }: StatusRowProps) => {
  return (
    <div className="flex justify-center px-2">
      <div className="status-pill" style={{ wordBreak: 'break-word' }}>
        <span>{message.content}</span>
      </div>
    </div>
  );
});

StatusRow.displayName = 'StatusRow';
export default StatusRow;
