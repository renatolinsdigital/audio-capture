import { useState, useCallback } from 'react';
import Header from './components/Header/Header';
import RecordingControls from './components/RecordingControls/RecordingControls';
import RecordingList from './components/RecordingList/RecordingList';
import SearchBar from './components/SearchBar/SearchBar';
import SaveModal from './components/SaveModal/SaveModal';
import AudioPlayer from './components/AudioPlayer/AudioPlayer';
import { useRecorder } from './hooks/useRecorder';
import { useRecordings } from './hooks/useRecordings';
import styles from './App.module.scss';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const { recordings, loadRecordings, renameRecording, deleteRecording } = useRecordings();
  const recorder = useRecorder();

  const handleStop = useCallback(async () => {
    await recorder.stopRecording();
    setShowSaveModal(true);
  }, [recorder]);

  const handleSave = useCallback(
    async (name: string) => {
      await recorder.saveRecording(name);
      setShowSaveModal(false);
      loadRecordings();
    },
    [recorder, loadRecordings]
  );

  const handleCancelSave = useCallback(async () => {
    // Save with a default name
    const defaultName = `Recording ${new Date().toLocaleString()}`;
    await recorder.saveRecording(defaultName);
    setShowSaveModal(false);
    loadRecordings();
  }, [recorder, loadRecordings]);

  const handlePlay = useCallback((slug: string) => {
    setCurrentlyPlaying(slug);
  }, []);

  const handleRename = useCallback(
    async (oldSlug: string, newName: string) => {
      await renameRecording(oldSlug, newName);
      if (currentlyPlaying === oldSlug) {
        // Update currently playing reference after rename
        const newSlug = newName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        setCurrentlyPlaying(newSlug);
      }
    },
    [renameRecording, currentlyPlaying]
  );

  const filteredRecordings = recordings.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const playingRecording = recordings.find(r => r.slug === currentlyPlaying);

  return (
    <div className={styles.app}>
      <Header status={recorder.status} elapsedTime={recorder.elapsedTime} />

      <main className={styles.main}>
        <aside className={styles.controlsPanel}>
          <RecordingControls
            status={recorder.status}
            onRecord={recorder.startRecording}
            onPause={recorder.pauseRecording}
            onResume={recorder.resumeRecording}
            onStop={handleStop}
          />
        </aside>

        <section className={styles.listPanel}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <RecordingList
            recordings={filteredRecordings}
            currentlyPlaying={currentlyPlaying}
            onPlay={handlePlay}
            onRename={handleRename}
            onDelete={deleteRecording}
          />
        </section>
      </main>

      <AudioPlayer recording={playingRecording || null} onClose={() => setCurrentlyPlaying(null)} />

      {showSaveModal && <SaveModal onSave={handleSave} onCancel={handleCancelSave} />}
    </div>
  );
}

export default App;
