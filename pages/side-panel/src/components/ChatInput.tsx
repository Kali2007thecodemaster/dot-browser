import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { t } from '@extension/i18n';
import { uploadStore } from '@extension/storage';
import FileUpload, { type FileUploadHandle, type UploadedFileData } from './FileUpload';
import FileChip from './FileChip';

interface ChatInputProps {
  onSendMessage: (text: string, displayText?: string) => void;
  onStopTask: () => void;
  onMicClick?: () => void;
  isRecording?: boolean;
  isProcessingSpeech?: boolean;
  disabled: boolean;
  showStopButton: boolean;
  setContent?: (setter: (text: string) => void) => void;
  isDarkMode?: boolean;
  historicalSessionId?: string | null;
  onReplay?: (sessionId: string) => void;
  /** Pause the running task. Shown alongside Stop when a task is in flight. */
  onPauseTask?: () => void;
  /** True while the user has paused the task; input becomes editable. */
  isPaused?: boolean;
  /** Resume without an interjection (just continue). */
  onResumeTask?: () => void;
}

export default function ChatInput({
  onSendMessage,
  onStopTask,
  onMicClick,
  isRecording = false,
  isProcessingSpeech = false,
  disabled,
  showStopButton,
  setContent,
  historicalSessionId,
  onReplay,
  onPauseTask,
  isPaused = false,
  onResumeTask,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<UploadedFileData[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileUploadRef = useRef<FileUploadHandle>(null);

  const isSendButtonDisabled = useMemo(
    () => disabled || (text.trim() === '' && attachedFiles.length === 0),
    [disabled, text, attachedFiles],
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
    }
  };

  useEffect(() => {
    if (setContent) setContent(setText);
  }, [setContent]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedText = text.trim();
      if (!trimmedText && attachedFiles.length === 0) return;

      let messageContent = trimmedText;
      let displayContent = trimmedText;

      if (attachedFiles.length > 0) {
        // Persist each attached file to uploadStore so the agent's
        // list_uploaded_files / read_uploaded_file actions can find them. The
        // store generates a fresh stable ID per file; we use that ID in the
        // inlined <nano_file_content> tag so the LLM sees and can reuse it
        // directly when calling read_uploaded_file.
        const persisted: Array<{ id: string; name: string; content: string }> = [];
        for (const f of attachedFiles) {
          try {
            const saved = await uploadStore.addFile({
              name: f.name,
              type: f.type,
              content: f.content,
              size: f.size,
            });
            persisted.push({ id: saved.id, name: saved.name, content: saved.content });
          } catch (err) {
            // Hit the per-file or total size cap. Fall back to inlining only —
            // the agent loses the action path but still sees the content in
            // the message body.
            console.error('uploadStore.addFile failed', err);
            persisted.push({ id: f.id, name: f.name, content: f.content });
          }
        }

        const fileContents = persisted
          .map(
            f =>
              `\n\n<nano_file_content type="file" id="${f.id}" name="${f.name}">\n${f.content}\n</nano_file_content>`,
          )
          .join('\n');
        messageContent = trimmedText
          ? `${trimmedText}\n\n<nano_attached_files>${fileContents}</nano_attached_files>`
          : `<nano_attached_files>${fileContents}</nano_attached_files>`;
        const fileList = persisted.map(f => `· ${f.name}`).join('\n');
        displayContent = trimmedText ? `${trimmedText}\n\n${fileList}` : fileList;
      }

      onSendMessage(messageContent, displayContent);
      setText('');
      setAttachedFiles([]);
      setErrorMsg(null);
    },
    [text, attachedFiles, onSendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  const handleReplay = useCallback(() => {
    if (historicalSessionId && onReplay) onReplay(historicalSessionId);
  }, [historicalSessionId, onReplay]);

  const handleFileAdded = useCallback((file: UploadedFileData) => {
    setAttachedFiles(prev => [...prev, file]);
    setErrorMsg(null);
  }, []);

  const handleFileRemove = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleFileError = useCallback((msg: string) => {
    setErrorMsg(msg);
  }, []);

  return (
    <div>
      {/* Error message */}
      {errorMsg && (
        <div
          className="label-mono px-3 py-1"
          style={{ borderLeft: '2px solid var(--accent)', color: 'var(--muted)', fontSize: 10 }}>
          {errorMsg}
        </div>
      )}

      {/* File chips */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pt-2">
          {attachedFiles.map(f => (
            <FileChip key={f.id} file={f} onRemove={handleFileRemove} />
          ))}
        </div>
      )}

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        onDragOver={e => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={async e => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            await fileUploadRef.current?.processFiles(e.dataTransfer.files);
          }
        }}
        className="glass-input"
        style={isDragOver ? { borderColor: 'var(--accent)' } : undefined}
        aria-label={t('chat_input_form')}>
        <div className="flex items-end gap-2 p-2.5">
          {/* Attach button (FileUpload renders the 📎 button + hidden input) */}
          <FileUpload
            ref={fileUploadRef}
            onFileAdded={handleFileAdded}
            onError={handleFileError}
            disabled={disabled && !isPaused}
          />

          {/* Textarea — usable when normally enabled OR when the task is paused
              and we're inviting an interjection. */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled && !isPaused}
            aria-disabled={disabled && !isPaused}
            rows={1}
            className="min-w-0 flex-1 resize-none border-none bg-transparent focus:outline-none"
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontSize: 14,
              lineHeight: 1.55,
              color: 'var(--text)',
              padding: '7px 4px',
              opacity: disabled && !isPaused ? 0.5 : 1,
              cursor: disabled && !isPaused ? 'not-allowed' : 'text',
            }}
            placeholder={
              isPaused
                ? 'Paused — add a clarification, then press send to resume'
                : attachedFiles.length > 0
                  ? 'Add a message (optional)...'
                  : t('chat_input_placeholder')
            }
            aria-label={t('chat_input_editor')}
          />

          {/* Mic button */}
          {onMicClick && (
            <button
              type="button"
              onClick={onMicClick}
              disabled={disabled || isProcessingSpeech}
              aria-label={
                isProcessingSpeech
                  ? t('chat_stt_processing')
                  : isRecording
                    ? t('chat_stt_recording_stop')
                    : t('chat_stt_input_start')
              }
              className="btn-icon-md"
              style={{
                border: `1px solid ${isRecording ? 'var(--accent)' : 'var(--line)'}`,
                background: isRecording ? 'var(--accent)' : 'transparent',
                cursor: disabled || isProcessingSpeech ? 'not-allowed' : 'pointer',
                opacity: disabled || isProcessingSpeech ? 0.4 : 1,
                color: isRecording ? 'var(--bg)' : 'var(--muted)',
              }}>
              {isProcessingSpeech ? (
                <AiOutlineLoading3Quarters className="size-3.5 animate-spin" />
              ) : (
                <FaMicrophone className="size-3.5" />
              )}
            </button>
          )}

          {/* Right-side controls — different layouts for each state:
              - Paused:   [▶ resume-now] [→ send-and-resume]
              - Running:  [‖ pause]      [■ stop]
              - Historical session: [↺ replay]
              - Idle:                    [→ send] */}
          {isPaused ? (
            <>
              <button
                type="button"
                onClick={onResumeTask}
                title="Resume without adding a message"
                aria-label="Resume task"
                className="btn-icon-md"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: 14,
                }}>
                ▶
              </button>
              <button
                type="submit"
                disabled={isSendButtonDisabled}
                aria-disabled={isSendButtonDisabled}
                title="Send clarification and resume"
                aria-label="Send and resume"
                className="btn-icon-md"
                style={{
                  background: isSendButtonDisabled ? 'var(--muted)' : 'var(--accent)',
                  color: 'var(--bg)',
                  cursor: isSendButtonDisabled ? 'not-allowed' : 'pointer',
                  fontSize: 18,
                }}>
                →
              </button>
            </>
          ) : showStopButton ? (
            <>
              {onPauseTask && (
                <button
                  type="button"
                  onClick={onPauseTask}
                  title="Pause to add a clarification"
                  aria-label="Pause task"
                  className="btn-icon-md"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}>
                  ‖
                </button>
              )}
              <button
                type="button"
                onClick={onStopTask}
                title="Stop task"
                aria-label="Stop task"
                className="btn-icon-md"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}>
                ■
              </button>
            </>
          ) : historicalSessionId ? (
            <button
              type="button"
              onClick={handleReplay}
              disabled={!historicalSessionId}
              className="btn-icon-md"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                cursor: historicalSessionId ? 'pointer' : 'not-allowed',
                opacity: historicalSessionId ? 1 : 0.4,
                fontSize: 16,
              }}>
              ↺
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSendButtonDisabled}
              aria-disabled={isSendButtonDisabled}
              className="btn-icon-md"
              style={{
                background: isSendButtonDisabled ? 'var(--muted)' : 'var(--accent)',
                color: 'var(--bg)',
                cursor: isSendButtonDisabled ? 'not-allowed' : 'pointer',
                fontSize: 18,
              }}>
              →
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
