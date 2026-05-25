import type { UploadedFileData } from './FileUpload';

interface FileChipProps {
  file: UploadedFileData;
  onRemove: (id: string) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const FileChip = ({ file, onRemove }: FileChipProps) => {
  return (
    <div
      className="glass label-mono flex items-center gap-1"
      style={{ borderRadius: 4, padding: '3px 6px', color: 'var(--text)', fontSize: 9 }}>
      <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file.name}
      </span>
      <span style={{ color: 'var(--muted)', flexShrink: 0 }}>· {formatSize(file.size)}</span>
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: 'var(--muted)',
          fontSize: 11,
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label={`Remove ${file.name}`}>
        ×
      </button>
    </div>
  );
};

export default FileChip;
