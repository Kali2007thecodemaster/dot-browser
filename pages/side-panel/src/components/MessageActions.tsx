import { memo, useState, useCallback } from 'react';
import { FiCopy, FiCheck, FiRefreshCw, FiEdit2 } from 'react-icons/fi';

interface MessageActionsProps {
  content: string;
  /** Right-align the toolbar (used for user bubbles which sit on the right). */
  alignRight?: boolean;
  /** Provided only when retry is allowed for this message (agent messages with a preceding user message). */
  onRetry?: () => void;
  /** Provided only for user messages — pre-fills the input box. */
  onEdit?: () => void;
  /** Disable retry/edit when the agent is currently running. Copy stays enabled. */
  disabled?: boolean;
}

const COPY_FEEDBACK_MS = 1500;

const MessageActions = memo(
  ({ content, alignRight = false, onRetry, onEdit, disabled = false }: MessageActionsProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
      } catch {
        // Some contexts (e.g. iframe without permission) reject the API — best-effort fallback.
        const ta = document.createElement('textarea');
        ta.value = content;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
        } catch {
          /* swallow */
        }
        document.body.removeChild(ta);
      }
    }, [content]);

    return (
      <div className={`msg-actions ${alignRight ? 'msg-actions-end' : ''}`}>
        <button
          type="button"
          onClick={handleCopy}
          className="msg-action"
          aria-label={copied ? 'Copied' : 'Copy message'}
          title={copied ? 'Copied' : 'Copy'}>
          {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
        </button>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={disabled}
            className="msg-action"
            aria-label="Retry"
            title="Retry">
            <FiRefreshCw size={13} />
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled}
            className="msg-action"
            aria-label="Edit and resend"
            title="Edit">
            <FiEdit2 size={13} />
          </button>
        )}
      </div>
    );
  },
);

MessageActions.displayName = 'MessageActions';
export default MessageActions;
