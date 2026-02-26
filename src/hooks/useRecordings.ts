import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Recording } from '../types';

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);

  const loadRecordings = useCallback(async () => {
    try {
      const list = await invoke<Recording[]>('list_recordings');
      setRecordings(list);
    } catch (err) {
      console.error('Failed to load recordings:', err);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const renameRecording = useCallback(
    async (oldSlug: string, newName: string) => {
      try {
        await invoke('rename_recording', { oldSlug, newName });
        await loadRecordings();
      } catch (err) {
        console.error('Failed to rename recording:', err);
      }
    },
    [loadRecordings]
  );

  const deleteRecording = useCallback(
    async (slug: string) => {
      try {
        await invoke('delete_recording', { slug });
        await loadRecordings();
      } catch (err) {
        console.error('Failed to delete recording:', err);
      }
    },
    [loadRecordings]
  );

  return {
    recordings,
    loadRecordings,
    renameRecording,
    deleteRecording,
  };
}
