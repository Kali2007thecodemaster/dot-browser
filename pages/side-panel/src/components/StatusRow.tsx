import { memo } from 'react';
import type { Message } from '@extension/storage';

interface StatusRowProps {
  message: Message;
}

const StatusRow = memo(({ message }: StatusRowProps) => {
  return (
    <div
      className="label-mono px-3 py-2"
      style={{
        borderLeft: '2px solid var(--accent)',
        background: 'transparent',
        color: 'var(--muted)',
        fontSize: 10,
        lineHeight: 1.6,
      }}>
      {message.content}
    </div>
  );
});

StatusRow.displayName = 'StatusRow';
export default StatusRow;
