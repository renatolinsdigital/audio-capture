export interface Recording {
  name: string;
  slug: string;
  duration_secs: number;
  created_at: string;
  file_size: number;
}

export type RecordingStatus = 'idle' | 'recording' | 'paused';
