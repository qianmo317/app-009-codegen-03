import { useKnitStore } from '../store/knitStore';
import type { SavedVersion } from './types';

function fmtTime(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function VersionList() {
  const versions = useKnitStore((s) => s.versions);
  const selected = useKnitStore((s) => s.selected);
  const editId = useKnitStore((s) => s.editId);
  const toggleSelect = useKnitStore((s) => s.toggleSelect);
  const loadDraft = useKnitStore((s) => s.loadDraft);
  const deleteVersion = useKnitStore((s) => s.deleteVersion);

  if (versions.length === 0) {
    return (
      <div className="kg-card">
        <h2>已存版本</h2>
        <p className="kg-hint">
          还没有存版。填好尺寸与密度后点「计算并存为新版本」，换一种粗线再存一版，就能并排对比。
        </p>
      </div>
    );
  }

  return (
    <div className="kg-card">
      <h2>已存版本（勾选参与对比）</h2>
      <div className="kg-versions">
        {versions.map((v: SavedVersion) => (
          <div
            key={v.id}
            className={`kg-ver-item ${selected.includes(v.id) ? 'selected' : ''} ${
              editId === v.id ? '' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(v.id)}
              onChange={() => toggleSelect(v.id)}
            />
            <div className="info">
              <div className="nm">
                <span className="kg-ver-name">{v.name}</span>
                {editId === v.id && (
                  <span className="kg-badge exact" style={{ marginLeft: 6 }}>
                    编辑中
                  </span>
                )}
              </div>
              <div className="meta">
                {v.input.yarnName || '未命名'} · {v.input.gauge.sts}针×{v.input.gauge.rows}行
                /10cm
              </div>
              <div className="meta">
                起 {v.result.back.castOn.value} 针 · {v.result.back.totalRows.value} 行 ·{' '}
                {fmtTime(v.createdAt)}
              </div>
            </div>
            <button className="kg-btn small ghost" onClick={() => loadDraft(v.id)}>
              改
            </button>
            <button className="kg-btn small danger" onClick={() => deleteVersion(v.id)}>
              删
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
