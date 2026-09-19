import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { calculateSizing, defaultMeasurements } from './calc';
import { makeFingerprint, useSizingStore } from './store';
import { VersionCard } from './VersionCard';
import './sizing.css';

interface FieldDef {
  key: 'bust' | 'length' | 'sleeveLength' | 'armholeDepth' | 'shoulderWidth' | 'bicep' | 'cuff' | 'capHeight';
  label: string;
  hint: (d: ReturnType<typeof defaultMeasurements>) => string;
  advanced?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: 'bust', label: '胸围（成品）', hint: () => '厘米，建议已含 5~10cm 松量' },
  { key: 'length', label: '衣长', hint: () => '后中量，厘米' },
  { key: 'sleeveLength', label: '袖长', hint: () => '肩点到袖口，厘米' },
  { key: 'armholeDepth', label: '挂肩高', hint: (d) => `留空 = 按胸围取 ${Math.round(d.armholeDepth * 10) / 10}`, advanced: true },
  { key: 'shoulderWidth', label: '肩宽', hint: (d) => `留空 = 按胸围取 ${Math.round(d.shoulderWidth * 10) / 10}`, advanced: true },
  { key: 'bicep', label: '上臂根围', hint: (d) => `留空 = 按胸围取 ${Math.round(d.bicep * 10) / 10}`, advanced: true },
  { key: 'cuff', label: '袖口围', hint: (d) => `留空 = 按胸围取 ${Math.round(d.cuff * 10) / 10}`, advanced: true },
  { key: 'capHeight', label: '袖山高', hint: (d) => `留空 = 按挂肩取 ${Math.round(d.capHeight * 10) / 10}`, advanced: true },
];

function MeasureForm() {
  const measurements = useSizingStore((s) => s.measurements);
  const setMeasurements = useSizingStore((s) => s.setMeasurements);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const defaults = defaultMeasurements(measurements.bust || 96);

  return (
    <div className="sizing-form">
      <div className="sizing-form-grid">
        {FIELDS.filter((f) => showAdvanced || !f.advanced).map((f) => (
          <label key={f.key} className="sizing-field">
            <span>{f.label}</span>
            <input
              type="number"
              min={0}
              step={f.key === 'bust' ? 1 : 0.5}
              placeholder={f.advanced ? '默认' : ''}
              value={measurements[f.key] || ''}
              onChange={(e) => setMeasurements({ [f.key]: Number(e.target.value) })}
            />
            <small>{f.hint(defaults)}</small>
          </label>
        ))}
      </div>
      <button className="sizing-btn sizing-btn-small" onClick={() => setShowAdvanced((v) => !v)}>
        {showAdvanced ? '收起细部尺寸' : '细部尺寸（挂肩/肩宽/袖肥…）'}
      </button>
    </div>
  );
}

function AddVersion() {
  const addVersion = useSizingStore((s) => s.addVersion);
  const [sts, setSts] = useState(16);
  const [rows, setRows] = useState(22);
  return (
    <div className="sizing-add">
      <span>换一种粗线再算：</span>
      <label>
        10cm
        <input type="number" min={1} step={0.5} value={sts} onChange={(e) => setSts(Number(e.target.value))} />
        针 ×
      </label>
      <label>
        <input type="number" min={1} step={0.5} value={rows} onChange={(e) => setRows(Number(e.target.value))} />
        行
      </label>
      <button
        className="sizing-btn sizing-btn-primary"
        onClick={() => addVersion({ stsPer10cm: sts, rowsPer10cm: rows })}
      >
        加入对比
      </button>
    </div>
  );
}

function CompareTable() {
  const measurements = useSizingStore((s) => s.measurements);
  const versions = useSizingStore((s) => s.versions);

  const rows = useMemo(() => {
    return versions.map((v) => {
      const r = calculateSizing(measurements, v.gauge);
      return { v, r };
    });
  }, [versions, measurements]);

  if (rows.length === 0) return null;

  const cells: { label: string; render: (r: ReturnType<typeof calculateSizing>) => string }[] = [
    { label: '密度（针×行 /10cm）', render: (r) => `${r.gauge.stsPer10cm}×${r.gauge.rowsPer10cm}` },
    { label: '前/后片起针', render: (r) => (r.errors.length ? '—' : `${r.body.castOn} 针`) },
    { label: '衣长总行数', render: (r) => (r.errors.length ? '—' : `${r.body.totalRows} 行`) },
    { label: '挂肩每侧减', render: (r) => (r.errors.length ? '—' : `${r.body.armholeDecPerSide} 针 / ${r.body.armholeRows} 行`) },
    { label: '挂肩节奏', render: (r) => (r.errors.length ? '—' : r.body.singleSchedule?.summary ?? '平收即可') },
    { label: '肩部留针', render: (r) => (r.errors.length ? '—' : `${r.body.shoulderSts} 针`) },
    { label: '袖口起针', render: (r) => (r.errors.length ? '—' : `${r.sleeve.castOn} 针`) },
    { label: '袖肥针数', render: (r) => (r.errors.length ? '—' : `${r.sleeve.upperSts} 针`) },
    { label: '袖长总行数', render: (r) => (r.errors.length ? '—' : `${r.sleeve.totalRows} 行`) },
    { label: '袖山节奏', render: (r) => (r.errors.length ? '—' : r.sleeve.capSchedule?.summary ?? '—') },
  ];

  return (
    <div className="sizing-compare-wrap">
      <h3 className="sizing-h3">各版本放在一起比</h3>
      <div className="sizing-table-scroll">
        <table className="sizing-table sizing-compare">
          <thead>
            <tr>
              <th style={{ width: 150 }}>项目</th>
              {rows.map(({ v }) => (
                <th key={v.id}>
                  {v.name}
                  <span className="sizing-compare-ver">
                    {' '}v{v.revision} #{v.fingerprint}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((c) => (
              <tr key={c.label}>
                <td className="sizing-compare-label">{c.label}</td>
                {rows.map(({ v, r }) => (
                  <td key={v.id}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Sizing() {
  const measurements = useSizingStore((s) => s.measurements);
  const versions = useSizingStore((s) => s.versions);
  const removeVersion = useSizingStore((s) => s.removeVersion);
  const renameVersion = useSizingStore((s) => s.renameVersion);
  const updateGauge = useSizingStore((s) => s.updateGauge);
  const recalc = useSizingStore((s) => s.recalc);
  const duplicateVersion = useSizingStore((s) => s.duplicateVersion);

  return (
    <div className="sizing-page">
      <div className="sizing-topbar">
        <Link to="/" className="sizing-back">
          ← 返回图解列表
        </Link>
        <h1>尺寸 → 编织指引</h1>
        <p className="sizing-subtitle">
          量身材、量织片密度，算出起针、减针节奏与逐行减针表；加多个密度版本横向对比，改动后一键重算。
        </p>
      </div>

      <section className="sizing-panel">
        <h2 className="sizing-h2">① 身材 / 成品尺寸（cm）</h2>
        <MeasureForm />
      </section>

      <section className="sizing-panel">
        <h2 className="sizing-h2">② 织片密度（10cm 多少针 × 多少行）</h2>
        <AddVersion />
        <p className="sizing-tip">每个密度是一个「版本」；换粗线就加一个版本，结果并排对比。</p>
      </section>

      <CompareTable />

      <section className="sizing-panel">
        <h2 className="sizing-h2">③ 各版本的编织指引</h2>
        <div className="sizing-cards">
          {versions.map((v) => {
            const result = calculateSizing(measurements, v.gauge);
            const currentFp = makeFingerprint(measurements, v.gauge);
            const dirty = currentFp !== v.fingerprint;
            return (
              <VersionCard
                key={v.id}
                version={v}
                result={result}
                dirty={dirty}
                onRemove={() => removeVersion(v.id)}
                onRename={(name) => renameVersion(v.id, name)}
                onGauge={(patch) => updateGauge(v.id, patch)}
                onRecalc={() => recalc(v.id)}
                onDuplicate={() => duplicateVersion(v.id)}
              />
            );
          })}
          {versions.length === 0 && <p className="sizing-empty">还没有版本，在上面加一个织片密度开始计算。</p>}
        </div>
      </section>
    </div>
  );
}
