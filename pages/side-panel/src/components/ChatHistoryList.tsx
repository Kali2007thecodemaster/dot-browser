/* eslint-disable react/prop-types */
import { FaTrash } from 'react-icons/fa';
import { BsBookmark } from 'react-icons/bs';
import { t } from '@extension/i18n';

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
}

interface ChatHistoryListProps {
  sessions: ChatSession[];
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onSessionBookmark: (sessionId: string) => void;
  visible: boolean;
  isDarkMode?: boolean;
}

const ChatHistoryList: React.FC<ChatHistoryListProps> = ({
  sessions,
  onSessionSelect,
  onSessionDelete,
  onSessionBookmark,
  visible,
  isDarkMode = false,
}) => {
  if (!visible) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="label-mono mb-4 text-ink">{t('chat_history_title')}</h2>
      {sessions.length === 0 ? (
        <div className="glass-card p-4 text-center text-muted">{t('chat_history_empty')}</div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <div key={session.id} className="glass-card group relative p-3 transition-opacity hover:opacity-80">
              <button onClick={() => onSessionSelect(session.id)} className="w-full text-left" type="button">
                <h3 className="text-sm font-medium text-ink">{session.title}</h3>
                <p className="mt-1 text-xs text-muted">{formatDate(session.createdAt)}</p>
              </button>

              {/* Bookmark button - top right */}
              {onSessionBookmark && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onSessionBookmark(session.id);
                  }}
                  className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 text-amber"
                  style={{ background: 'var(--surface)' }}
                  aria-label={t('chat_history_bookmark')}
                  type="button">
                  <BsBookmark size={14} />
                </button>
              )}

              {/* Delete button - bottom right */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onSessionDelete(session.id);
                }}
                className="absolute bottom-2 right-2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 text-muted"
                style={{ background: 'var(--surface)' }}
                aria-label={t('chat_history_delete')}
                type="button">
                <FaTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatHistoryList;
