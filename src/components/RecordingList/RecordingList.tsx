import { useState } from 'react';
import { Recording } from '../../types';
import styles from './RecordingList.module.scss';

interface RecordingListProps {
  recordings: Recording[];
  currentlyPlaying: string | null;
  onPlay: (slug: string) => void;
  onRename: (oldSlug: string, newName: string) => void;
  onDelete: (slug: string) => void;
}

function formatDuration(secs: number): string {
  const mins = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${mins}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RecordingList({
  recordings,
  currentlyPlaying,
  onPlay,
  onRename,
  onDelete,
}: RecordingListProps) {
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (rec: Recording) => {
    setEditingSlug(rec.slug);
    setEditName(rec.name);
  };

  const confirmEdit = (oldSlug: string) => {
    if (editName.trim()) {
      onRename(oldSlug, editName.trim());
    }
    setEditingSlug(null);
  };

  const cancelEdit = () => {
    setEditingSlug(null);
  };

  if (recordings.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>◇</div>
        <div className={styles.emptyText}>NO RECORDINGS YET</div>
        <div className={styles.emptyHint}>Hit record to capture system audio</div>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span className={styles.colName}>NAME</span>
        <span className={styles.colDuration}>DURATION</span>
        <span className={styles.colSize}>SIZE</span>
        <span className={styles.colDate}>DATE</span>
        <span className={styles.colActions}>ACTIONS</span>
      </div>
      {recordings.map(rec => (
        <div
          key={rec.slug}
          className={`${styles.item} ${currentlyPlaying === rec.slug ? styles.playing : ''}`}
        >
          <div className={styles.colName}>
            {editingSlug === rec.slug ? (
              <div className={styles.editRow}>
                <input
                  className={styles.editInput}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmEdit(rec.slug);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
                <button className={styles.editConfirm} onClick={() => confirmEdit(rec.slug)}>
                  ✓
                </button>
                <button className={styles.editCancel} onClick={cancelEdit}>
                  ✕
                </button>
              </div>
            ) : (
              <span className={styles.name} title={rec.name}>
                {rec.name}
              </span>
            )}
          </div>
          <span className={styles.colDuration}>{formatDuration(rec.duration_secs)}</span>
          <span className={styles.colSize}>{formatSize(rec.file_size)}</span>
          <span className={styles.colDate}>{formatDate(rec.created_at)}</span>
          <div className={styles.colActions}>
            <button className={styles.actionBtn} onClick={() => onPlay(rec.slug)} title="Play">
              ▶
            </button>
            <button className={styles.actionBtn} onClick={() => startEditing(rec)} title="Rename">
              ✎
            </button>
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={() => onDelete(rec.slug)}
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
