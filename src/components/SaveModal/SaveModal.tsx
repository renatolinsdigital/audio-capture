import { useState, useRef, useEffect } from 'react';
import styles from './SaveModal.module.scss';

interface SaveModalProps {
  onSave: (name: string) => void;
  onCancel: () => void;
}

export default function SaveModal({ onSave, onCancel }: SaveModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Save Recording</h2>
          <button className={styles.closeBtn} onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <label className={styles.label}>Recording Name</label>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="Enter a name..."
          />
          {slug && (
            <div className={styles.slugPreview}>
              <span className={styles.slugLabel}>FILE:</span>
              <span className={styles.slugValue}>{slug}.wav</span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Skip
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={!name.trim()}>
            Save Recording
          </button>
        </div>
      </div>
    </div>
  );
}
