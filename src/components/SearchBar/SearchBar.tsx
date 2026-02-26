import styles from './SearchBar.module.scss';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className={styles.searchBar}>
      <span className={styles.icon}>⌕</span>
      <input
        type="text"
        className={styles.input}
        placeholder="Search recordings..."
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button className={styles.clear} onClick={() => onChange('')}>
          ✕
        </button>
      )}
    </div>
  );
}
