import { useRef, useEffect, useState, useCallback } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { Recording } from '../../types';
import styles from './AudioPlayer.module.scss';

interface AudioPlayerProps {
  recording: Recording | null;
  playKey: number;
  onClose: () => void;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ recording, playKey, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadAudio = useCallback(async () => {
    if (!recording || !audioRef.current) return;
    try {
      const path = await invoke<string>('get_recording_path', {
        slug: recording.slug,
      });
      // Normalize Windows backslashes — convertFileSrc requires forward slashes
      const normalizedPath = path.replace(/\\/g, '/');
      const url = convertFileSrc(normalizedPath);
      audioRef.current.src = url;
      audioRef.current.load();
      // Auto-play once the audio is ready
      audioRef.current.oncanplaythrough = () => {
        audioRef.current?.play().catch(err => {
          console.error('[AudioPlayer] auto-play rejected:', err);
        });
        if (audioRef.current) audioRef.current.oncanplaythrough = null;
      };
    } catch (err) {
      console.error('[AudioPlayer] Failed to load audio:', err);
    }
  }, [recording]);

  // Track whether the previous recording slug differs from the current one
  const prevSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const audio = audioRef.current;
    const isSameTrack = prevSlugRef.current === recording.slug;
    prevSlugRef.current = recording.slug;

    if (isSameTrack && audio) {
      // Same track pressed again — if still playing or paused mid-track, restart
      // from the beginning. If ended, also restart.
      audio.currentTime = 0;
      audio.play().catch(err => {
        console.error('[AudioPlayer] replay rejected:', err);
      });
    } else {
      // Different track — load fresh
      loadAudio();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [recording, playKey, loadAudio]);

  // Attach event listeners whenever the recording changes, because the
  // <audio> element is only present when recording is non-null.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      const d = audio.duration;
      setDuration(d && isFinite(d) ? d : 0);
    };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      console.error(
        '[AudioPlayer] Audio load error',
        audio.error?.code,
        audio.error?.message,
        audio.src
      );
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, [recording]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('[AudioPlayer] play() rejected:', err);
      });
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!recording) {
    return null;
  }

  return (
    <div className={styles.player}>
      <audio ref={audioRef} />

      <button className={styles.playBtn} onClick={togglePlay}>
        {isPlaying ? '❚❚' : '▶'}
      </button>

      <div className={styles.info}>
        <span className={styles.trackName}>{recording.name}</span>
        <span className={styles.trackTime}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className={styles.progressBar} onClick={seek}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      <button className={styles.closeBtn} onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
