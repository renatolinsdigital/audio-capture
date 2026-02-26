import { RecordingStatus } from '../../types';
import styles from './Header.module.scss';

interface HeaderProps {
  status: RecordingStatus;
  elapsedTime: number;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function Header({ status, elapsedTime }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <h1 className={styles.title}>Audio Capture</h1>
        <span className={styles.version}>v0.1.0</span>
      </div>

      <div className={styles.statusGroup}>
        {status !== 'idle' && (
          <>
            <span
              className={`${styles.indicator} ${
                status === 'recording' ? styles.recording : styles.paused
              }`}
            />
            <span className={styles.statusLabel}>{status === 'recording' ? 'REC' : 'PAUSED'}</span>
            <span className={styles.timer}>{formatTime(elapsedTime)}</span>
          </>
        )}
        {status === 'idle' && <span className={styles.idleLabel}>READY</span>}
      </div>
    </header>
  );
}
