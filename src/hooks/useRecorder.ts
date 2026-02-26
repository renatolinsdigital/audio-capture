import { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RecordingStatus } from '../types';

export function useRecorder() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      await invoke('start_recording');
      setStatus('recording');
      accumulatedRef.current = 0;
      setElapsedTime(0);
      startTimer();
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [startTimer]);

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

  return {
    status,
    elapsedTime,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    saveRecording,
  };
}
