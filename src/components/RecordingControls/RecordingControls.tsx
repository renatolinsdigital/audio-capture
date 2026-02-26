import { BitDepth, ChannelMode, RecordingStatus } from '../../types';
import styles from './RecordingControls.module.scss';

interface RecordingControlsProps {
  status: RecordingStatus;
  gainDb: number;
  onGainChange: (db: number) => void;
  bitDepth: BitDepth;
  channelMode: ChannelMode;
  onQualityChange: (bitDepth: BitDepth, channelMode: ChannelMode) => void;
  outputDir: string;
  onChangeOutputDir: () => void;
  onOpenOutputDir: () => void;
  onRecord: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

/** Approximate uncompressed WAV size at 48 kHz for 1 minute of recording. */
function estimateSizeMbPerMin(bitDepth: BitDepth, channelMode: ChannelMode): string {
  const bytesPerSample = bitDepth / 8;
  const channels = channelMode === 'stereo' ? 2 : 1;
  const mb = (48000 * bytesPerSample * channels * 60) / 1048576;
  return mb.toFixed(1);
}

function qualityDescription(bitDepth: BitDepth, channelMode: ChannelMode): string {
  if (bitDepth === 16 && channelMode === 'mono') return 'Voice optimised · smallest files';
  if (bitDepth === 16 && channelMode === 'stereo') return 'CD quality · standard size';
  if (bitDepth === 32 && channelMode === 'mono') return 'High precision · mono capture';
  return 'Maximum precision · largest files';
}

export default function RecordingControls({
  status,
  gainDb,
  onGainChange,
  bitDepth,
  channelMode,
  onQualityChange,
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
        <div className={styles.qualitySection}>
          <div className={styles.qualityHeader}>
            <span className={styles.qualityLabel}>QUALITY</span>
          </div>

          <div className={styles.qualityRow}>
            <span className={styles.qualityRowLabel}>BIT DEPTH</span>
            <div className={styles.qualityToggle}>
              <button
                className={`${styles.qualityBtn} ${bitDepth === 16 ? styles.qualityBtnActive : ''}`}
                onClick={() => onQualityChange(16, channelMode)}
                title="16-bit PCM — standard quality, universally compatible, half the file size of 32-bit float"
              >
                16-bit
              </button>
              <button
                className={`${styles.qualityBtn} ${bitDepth === 32 ? styles.qualityBtnActive : ''}`}
                onClick={() => onQualityChange(32, channelMode)}
                title="32-bit Float — maximum dynamic range and precision; use for music production or post-processing"
              >
                32-bit
              </button>
            </div>
          </div>

          <div className={styles.qualityRow}>
            <span className={styles.qualityRowLabel}>CHANNELS</span>
            <div className={styles.qualityToggle}>
              <button
                className={`${styles.qualityBtn} ${channelMode === 'stereo' ? styles.qualityBtnActive : ''}`}
                onClick={() => onQualityChange(bitDepth, 'stereo')}
                title="Stereo — captures left and right channels separately; preserves spatial audio"
              >
                Stereo
              </button>
              <button
                className={`${styles.qualityBtn} ${channelMode === 'mono' ? styles.qualityBtnActive : ''}`}
                onClick={() => onQualityChange(bitDepth, 'mono')}
                title="Mono — L+R averaged into a single channel; halves file size; ideal for voice and meetings"
              >
                Mono
              </button>
            </div>
          </div>

          <div className={styles.qualityHint}>
            <span className={styles.qualitySize}>
              ~{estimateSizeMbPerMin(bitDepth, channelMode)} MB/min
            </span>
            <span className={styles.qualityDesc}>{qualityDescription(bitDepth, channelMode)}</span>
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
