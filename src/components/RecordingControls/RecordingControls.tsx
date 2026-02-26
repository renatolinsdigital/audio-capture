import { RecordingStatus } from '../../types';
import styles from './RecordingControls.module.scss';

interface RecordingControlsProps {
  status: RecordingStatus;
  gainDb: number;
  onGainChange: (db: number) => void;
  outputDir: string;
  onChangeOutputDir: () => void;
  onOpenOutputDir: () => void;
  onRecord: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function RecordingControls({
  status,
  gainDb,
  onGainChange,
  outputDir,
  onChangeOutputDir,
  onOpenOutputDir,
  onRecord,
  onPause,
  onResume,
  onStop,
}: RecordingControlsProps) {
  const gainLabel =
    gainDb === 0 ? '0 dB' : gainDb > 0 ? `+${gainDb.toFixed(1)} dB` : `${gainDb.toFixed(1)} dB`;

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

      {status === 'idle' && (
        <div className={styles.gainSection}>
          <label className={styles.gainLabel}>
            <span>GAIN</span>
            <span className={styles.gainValue}>{gainLabel}</span>
          </label>
          <div className={styles.gainSliderRow}>
            <span className={styles.gainEdge}>-6</span>
            <input
              type="range"
              className={styles.gainSlider}
              min="-6"
              max="6"
              step="0.5"
              value={gainDb}
              onChange={e => onGainChange(parseFloat(e.target.value))}
            />
            <span className={styles.gainEdge}>+6</span>
          </div>
        </div>
      )}

      {status === 'idle' && (
        <div className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <span className={styles.outputLabel}>OUTPUT FOLDER</span>
            <div className={styles.outputActions}>
              <button
                className={styles.outputBtn}
                onClick={onOpenOutputDir}
                title="Open in Explorer"
              >
                &#128193;
              </button>
              <button
                className={styles.outputBtn}
                onClick={onChangeOutputDir}
                title="Change folder"
              >
                &#8230;
              </button>
            </div>
          </div>
          <div className={styles.outputPath} title={outputDir}>
            {outputDir || '—'}
          </div>
        </div>
      )}

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
