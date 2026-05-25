import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker via Vite's asset handling
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

export interface UploadedFileData {
  id: string;
  name: string;
  type: 'md';
  content: string;
  size: number;
}

export interface FileUploadHandle {
  processFiles: (files: FileList | File[]) => Promise<void>;
}

interface FileUploadProps {
  onFileAdded: (file: UploadedFileData) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function pdfToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const baseName = file.name.replace(/\.pdf$/i, '');
  const parts: string[] = [`# ${baseName}\n`];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/ {2,}/g, ' ')
      .trim();
    if (pageText) {
      if (pdf.numPages > 1) parts.push(`\n---\n_Page ${i}_\n`);
      parts.push(pageText);
    }
  }
  return parts.join('\n');
}

const FileUpload = forwardRef<FileUploadHandle, FileUploadProps>(({ onFileAdded, onError, disabled }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          onError(`${file.name} exceeds 5MB limit`);
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'md' && ext !== 'pdf') {
          onError(`${file.name}: only .md and .pdf files are supported`);
          continue;
        }
        try {
          const content = ext === 'pdf' ? await pdfToMarkdown(file) : await file.text();
          onFileAdded({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: ext === 'pdf' ? file.name.replace(/\.pdf$/i, '.md') : file.name,
            type: 'md',
            content,
            size: file.size,
          });
        } catch (err) {
          onError(`Failed to read ${file.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [onFileAdded, onError],
  );

  useImperativeHandle(ref, () => ({ processFiles }), [processFiles]);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Attach file"
        style={{
          width: 32,
          height: 32,
          border: '1px solid var(--line)',
          borderRadius: 4,
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'border-color 0.2s linear',
          opacity: disabled ? 0.4 : 1,
          fontSize: 18,
          fontWeight: 300,
          lineHeight: 1,
          color: 'var(--muted)',
        }}>
        +
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.pdf"
        className="hidden"
        onChange={e => e.target.files && processFiles(e.target.files)}
        aria-hidden="true"
      />
    </>
  );
});

FileUpload.displayName = 'FileUpload';
export default FileUpload;
