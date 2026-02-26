import { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RecordingStatus, BitDepth, ChannelMode } from '../types';

export function useRecorder() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gainDb, setGainDb] = useState(0);
  const [outputDir, setOutputDirState] = useState('');
  const [bitDepth, setBitDepth] = useState<BitDepth>(16);
  const [channelMode, setChannelMode] = useState<ChannelMode>('stereo');
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load the output dir and quality settings from Rust once on mount
  useEffect(() => {
    invoke<string>('get_output_dir')
      .then(d => setOutputDirState(d))
      .catch(err => console.error('Failed to load output dir:', err));

    invoke<[number, string]>('get_audio_quality')
      .then(([bd, ch]) => {
        setBitDepth((bd === 32 ? 32 : 16) as BitDepth);
        setChannelMode(ch === 'mono' ? 'mono' : 'stereo');
      })
      .catch(err => console.error('Failed to load audio quality:', err));
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        const now = Date.now();
        const total = accumulatedRef.current + (now - startTimeRef.current);
        setElapsedTime(Math.floor(total / 1000));
      }
    }, 200);
  }, []);

  const pauseTimer = useCallback(() => {
    if (startTimeRef.current !== null) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      startTimeRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
    accumulatedRef.current = 0;
    setElapsedTime(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      await invoke('start_recording', { gainDb });
      setStatus('recording');
      accumulatedRef.current = 0;
      setElapsedTime(0);
      startTimer();
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [startTimer, gainDb]);

  const pauseRecording = useCallback(async () => {
    try {
      await invoke('pause_recording');
      setStatus('paused');
      pauseTimer();
    } catch (err) {
      console.error('Failed to pause recording:', err);
    }
  }, [pauseTimer]);

  const resumeRecording = useCallback(async () => {
    try {
      await invoke('resume_recording');
      setStatus('recording');
      startTimer();
    } catch (err) {
      console.error('Failed to resume recording:', err);
    }
  }, [startTimer]);

  const stopRecording = useCallback(async () => {
    try {
      await invoke('stop_recording');
      setStatus('idle');
      stopTimer();
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  }, [stopTimer]);

  const saveRecording = useCallback(async (name: string) => {
    try {
      await invoke('save_recording', { name });
    } catch (err) {
      console.error('Failed to save recording:', err);
    }
  }, []);

  const changeOutputDir = useCallback(async (): Promise<string | null> => {
    try {
      const picked = await invoke<string | null>('pick_output_dir');
      if (picked) {
        await invoke('set_output_dir', { path: picked });
        setOutputDirState(picked);
        return picked;
      }
    } catch (err) {
      console.error('Failed to change output dir:', err);
    }
    return null;
  }, []);

  const openOutputFolder = useCallback(async () => {
    try {
      await invoke('open_output_dir');
    } catch (err) {
      console.error('Failed to open output folder:', err);
    }
  }, []);

  const setAudioQuality = useCallback(
    async (newBitDepth: BitDepth, newChannelMode: ChannelMode) => {
      try {
        await invoke('set_audio_quality', {
          bitDepth: newBitDepth,
          channels: newChannelMode,
        });
        setBitDepth(newBitDepth);
        setChannelMode(newChannelMode);
      } catch (err) {
        console.error('Failed to save audio quality:', err);
      }
    },
    []
  );

  return {
    status,
    elapsedTime,
    gainDb,
    setGainDb,
    outputDir,
    changeOutputDir,
    openOutputFolder,
    bitDepth,
    channelMode,
    setAudioQuality,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    saveRecording,
  };
}
