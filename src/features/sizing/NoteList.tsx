import type { SizingResult } from './calc';

export function NoteList({ result }: { result: SizingResult }) {
  return (
    <ul className="sizing-note-list">
      {result.notes.map((n, i) => (
        <li key={i}>
          <b>{n.target}</b>：精确 {Math.round(n.exact * 100) / 100} {n.unit} → 取{' '}
          <b>{n.rounded}</b> {n.unit}
          <span className="sizing-dir">{n.direction}</span>
        </li>
      ))}
    </ul>
  );
}
