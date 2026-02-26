import { RecordingStatus } from '../../types';
import styles from './RecordingControls.module.scss';

interface RecordingControlsProps {
  status: RecordingStatus;
  onRecord: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function RecordingControls({
  status,
  onRecord,
  onPause,
  onResume,
  onStop,
}: RecordingControlsProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.visualizer}>
        <div
          className={`${styles.ring} ${
            status === 'recording' ? styles.active : ''
          } ${status === 'paused' ? styles.pausedRing : ''}`}
        >
          <div className={styles.innerRing}>
            <span className={styles.icon}>
              {status === 'idle' && '●'}
              {status === 'recording' && '●'}
              {status === 'paused' && '❚❚'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.label}>
        {status === 'idle' && 'READY TO RECORD'}
        {status === 'recording' && 'RECORDING...'}
        {status === 'paused' && 'PAUSED'}
      </div>

      <div className={styles.buttons}>
        {status === 'idle' && (
          <button className={styles.recordBtn} onClick={onRecord}>
            ● Record
          </button>
        )}

        {status === 'recording' && (
          <>
            <button className={styles.pauseBtn} onClick={onPause}>
              ❚❚ Pause
            </button>
            <button className={styles.stopBtn} onClick={onStop}>
              ■ Stop
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button className={styles.resumeBtn} onClick={onResume}>
              ● Resume
            </button>
            <button className={styles.stopBtn} onClick={onStop}>
              ■ Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
